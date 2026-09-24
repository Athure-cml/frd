<script lang="ts" setup>
import type { CostTableTemplate, FreightCostRecord } from '#/api/cost';

import { computed, nextTick, ref } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';

import { message } from 'ant-design-vue';

import { useVbenForm } from '#/adapter/form';
import { renewSeaCost, seaCostApi } from '#/api/cost';
import { $t } from '#/locales';

import {
  buildTemplateFormSchema,
  extractExtraFields,
  mergeRecordWithExtraFields,
} from '../shared/build-template-form-schema';
import {
  computeSeaAllIn,
  parsePortNames,
  prefetchPortNameZh,
  resolveCnShortNameFromPods,
  rowToFreightFormValues,
  toFreightSavePayload,
  useFreightFormSchema,
} from '../shared/freight-schema';
import { getDefaultTemplate } from './default-templates';
import { isCostCopyPayload, isCostRenewPayload } from './drawer-data';

const props = defineProps<{
  mode: 'sea';
}>();

const emit = defineEmits<{ success: [] }>();

const SEA_FREIGHT_EFF_FIELDS = [
  'cf_sea_freight_eff',
  'cf_seaFreightEff',
] as const;

const recordId = ref<number>();
const isCopy = ref(false);
const isRenew = ref(false);
const copyFromId = ref<number>();
const renewFromId = ref<number>();
const hydrating = ref(false);
const api = seaCostApi;
const activeTemplate = ref<CostTableTemplate>(getDefaultTemplate(props.mode));

const SEA_ALL_IN_TRIGGER_FIELDS = new Set([
  'buc',
  'ebs',
  'freight',
  'gri',
  'others',
]);

const [Form, formApi] = useVbenForm({
  handleValuesChange(values, fieldsChanged) {
    if (hydrating.value) {
      return;
    }
    if (fieldsChanged.includes('pod')) {
      const cnShortName = resolveCnShortNameFromPods(values.pod);
      if (cnShortName) {
        formApi.setFieldValue('cnShortName', cnShortName);
      }
    }
    if (fieldsChanged.some((field) => SEA_ALL_IN_TRIGGER_FIELDS.has(field))) {
      const allIn = computeSeaAllIn(values);
      if (allIn !== values.allIn) {
        formApi.setFieldValue('allIn', allIn);
      }
    }
  },
  layout: 'vertical',
  schema: useFreightFormSchema(),
  showDefaultActions: false,
  wrapperClass: 'grid-cols-1 sm:grid-cols-2',
});

const getTitle = computed(() => {
  if (recordId.value) {
    return $t('page.costLibrary.actions.editRecord');
  }
  if (isRenew.value) {
    return $t('page.costLibrary.actions.renewRecord', [
      $t('page.costLibrary.seaRecord'),
    ]);
  }
  if (isCopy.value) {
    return $t('page.costLibrary.actions.copyRecord', [
      $t('page.costLibrary.seaRecord'),
    ]);
  }
  return $t('page.costLibrary.actions.createRecord', [
    $t('page.costLibrary.seaRecord'),
  ]);
});

function applyTemplateSchema(template?: CostTableTemplate) {
  activeTemplate.value = template ?? getDefaultTemplate(props.mode);
  formApi.setState({
    schema: buildTemplateFormSchema(
      props.mode,
      activeTemplate.value,
      useFreightFormSchema(),
    ),
  });
}

function readFreightEffectiveDate(values: Record<string, unknown>) {
  for (const field of SEA_FREIGHT_EFF_FIELDS) {
    const flat = values[`extraFields.${field}`];
    if (flat !== null && flat !== undefined && String(flat).trim() !== '') {
      return String(flat).trim();
    }
    const nested = (
      values.extraFields as Record<string, unknown> | undefined
    )?.[field];
    if (
      nested !== null &&
      nested !== undefined &&
      String(nested).trim() !== ''
    ) {
      return String(nested).trim();
    }
  }
  return '';
}

function readOptionalValidDate(value: unknown) {
  if (value === null || value === undefined || value === '') {
    return '';
  }
  return String(value).trim();
}

function validateSeaRenewDates(values: Record<string, unknown>) {
  const freightEff = readFreightEffectiveDate(values);
  if (!freightEff) {
    message.warning($t('page.costLibrary.hint.renewSeaFreightEffRequired'));
    return false;
  }
  if (!renewFromId.value) {
    message.error($t('page.costLibrary.hint.renewSourceMissing'));
    return false;
  }
  const pairs: Array<[unknown, string]> = [
    [values.freightValidDate, freightEff],
    [
      values.bucValidDate,
      readExtraEff(values, 'cf_sea_bunker_eff', 'cf_seaBunkerEff'),
    ],
    [
      values.othersValidDate,
      readExtraEff(values, 'cf_sea_others_eff', 'cf_seaOthersEff'),
    ],
  ];
  for (const [validRaw, eff] of pairs) {
    if (!eff) {
      continue;
    }
    const valid = readOptionalValidDate(validRaw);
    if (valid && valid < eff) {
      message.warning($t('page.costLibrary.hint.renewValidBeforeEff'));
      return false;
    }
  }
  return true;
}

function readExtraEff(values: Record<string, unknown>, ...fields: string[]) {
  for (const field of fields) {
    const flat = values[`extraFields.${field}`];
    if (flat !== null && flat !== undefined && String(flat).trim() !== '') {
      return String(flat).trim();
    }
    const nested = (
      values.extraFields as Record<string, unknown> | undefined
    )?.[field];
    if (
      nested !== null &&
      nested !== undefined &&
      String(nested).trim() !== ''
    ) {
      return String(nested).trim();
    }
  }
  return '';
}

async function hydrateFormValues(
  row: FreightCostRecord | Record<string, unknown>,
) {
  hydrating.value = true;
  try {
    const values = mergeRecordWithExtraFields(
      rowToFreightFormValues(row as FreightCostRecord),
    );
    await prefetchPortNameZh([
      ...parsePortNames(values.pol as string | string[]),
      ...(values.pod ? [String(values.pod).trim()] : []),
    ]);
    values.allIn = computeSeaAllIn(values);
    formApi.setValues(values);
    await nextTick();
  } finally {
    hydrating.value = false;
  }
}

const [Drawer, drawerApi] = useVbenDrawer({
  class: 'w-full sm:w-[520px]',
  async onConfirm() {
    const { valid } = await formApi.validate();
    if (!valid) {
      return;
    }
    const values = await formApi.getValues();
    if (isRenew.value && !validateSeaRenewDates(values)) {
      return;
    }
    drawerApi.lock();
    try {
      const payload = {
        ...toFreightSavePayload(values),
        extraFields: extractExtraFields(values),
        ...(isCopy.value && copyFromId.value
          ? { copyHighlightFromId: copyFromId.value }
          : {}),
      };
      if (recordId.value) {
        await api.update(recordId.value, payload);
      } else if (isRenew.value && renewFromId.value) {
        await renewSeaCost(renewFromId.value, payload);
      } else {
        await api.create(payload);
      }
      message.success(
        isRenew.value
          ? $t('page.costLibrary.hint.renewSuccess')
          : $t('ui.actionMessage.operationSuccess'),
      );
      emit('success');
      drawerApi.close();
    } finally {
      drawerApi.unlock();
    }
  },
  onOpenChange(isOpen) {
    if (!isOpen) {
      return;
    }
    void (async () => {
      const data = drawerApi.getData<
        FreightCostRecord & {
          aiPrefill?: boolean;
          copyFrom?: boolean;
          copyFromId?: number;
          renewFrom?: boolean;
          renewFromId?: number;
          template?: CostTableTemplate;
        }
      >();
      recordId.value = data?.aiPrefill ? undefined : data?.id;
      isCopy.value = isCostCopyPayload(data);
      isRenew.value = isCostRenewPayload(data);
      copyFromId.value = data?.copyFromId;
      renewFromId.value = data?.renewFromId;
      applyTemplateSchema(data?.template);
      formApi.resetForm();
      if (data?.aiPrefill) {
        const {
          aiPrefill: _ai,
          template: _tpl,
          id: _id,
          status: _status,
          ...fields
        } = data as Record<string, unknown>;
        await hydrateFormValues(fields);
        return;
      }
      if (data?.id) {
        await hydrateFormValues(data);
        return;
      }
      if ((isCopy.value || isRenew.value) && data) {
        await hydrateFormValues(data as FreightCostRecord);
        return;
      }
      hydrating.value = true;
      try {
        formApi.setValues({ extraFields: {} });
        await nextTick();
      } finally {
        hydrating.value = false;
      }
    })();
  },
});
</script>

<template>
  <Drawer :title="getTitle">
    <p
      v-if="isRenew"
      class="text-muted-foreground mb-3 text-sm leading-relaxed"
    >
      {{ $t('page.costLibrary.hint.renewSeaDesc') }}
    </p>
    <Form class="cost-drawer-form px-1" />
  </Drawer>
</template>
