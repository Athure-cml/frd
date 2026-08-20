<script lang="ts" setup>
import type { CostTableTemplate, FreightCostRecord } from '#/api/cost';

import { computed, nextTick, ref } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';

import { message } from 'ant-design-vue';

import { useVbenForm } from '#/adapter/form';
import { seaCostApi } from '#/api/cost';
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
import { isCostCopyPayload } from './drawer-data';

const props = defineProps<{
  mode: 'sea';
}>();

const emit = defineEmits<{ success: [] }>();

const recordId = ref<number>();
const isCopy = ref(false);
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
    drawerApi.lock();
    try {
      const values = await formApi.getValues();
      const payload = {
        ...toFreightSavePayload(values),
        extraFields: extractExtraFields(values),
      };
      await (recordId.value
        ? api.update(recordId.value, payload)
        : api.create(payload));
      message.success($t('ui.actionMessage.operationSuccess'));
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
          template?: CostTableTemplate;
        }
      >();
      recordId.value = data?.aiPrefill ? undefined : data?.id;
      isCopy.value = isCostCopyPayload(data);
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
      if (isCopy.value && data) {
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
    <Form class="cost-drawer-form px-1" />
  </Drawer>
</template>
