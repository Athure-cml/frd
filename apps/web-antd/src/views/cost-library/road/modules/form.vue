<script lang="ts" setup>
import type { CostTableTemplate, RoadCostRecord } from '#/api/cost';

import { computed, ref } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';

import { message } from 'ant-design-vue';

import { useVbenForm } from '#/adapter/form';
import { createRoadCost, renewRoadCost, updateRoadCost } from '#/api/cost';
import { $t } from '#/locales';

import {
  buildTemplateFormSchema,
  extractExtraFields,
  mergeRecordWithExtraFields,
} from '../../shared/build-template-form-schema';
import { getDefaultTemplate } from '../../shared/default-templates';
import {
  isCostCopyPayload,
  isCostRenewPayload,
} from '../../shared/drawer-data';
import {
  loadSupplierFormulaCache,
  rowToRoadFormValues,
  toRoadSavePayload,
  useRoadFormSchema,
} from '../form-schema';

const emit = defineEmits<{ success: [] }>();

const ROAD_EFF_FIELD = 'cf_road_eff';

const recordId = ref<number>();
const isCopy = ref(false);
const isRenew = ref(false);
const renewFromId = ref<number>();
const activeTemplate = ref<CostTableTemplate>(getDefaultTemplate('road'));

const [Form, formApi] = useVbenForm({
  layout: 'vertical',
  schema: useRoadFormSchema(),
  showDefaultActions: false,
  wrapperClass: 'grid-cols-1 sm:grid-cols-2',
});

const getTitle = computed(() => {
  if (recordId.value) {
    return $t('page.costLibrary.actions.editRecord');
  }
  if (isRenew.value) {
    return $t('page.costLibrary.actions.renewRecord', [
      $t('page.costLibrary.roadRecord'),
    ]);
  }
  if (isCopy.value) {
    return $t('page.costLibrary.actions.copyRecord', [
      $t('page.costLibrary.roadRecord'),
    ]);
  }
  return $t('page.costLibrary.actions.createRecord', [
    $t('page.costLibrary.roadRecord'),
  ]);
});

function applyTemplateSchema(template?: CostTableTemplate) {
  activeTemplate.value = template ?? getDefaultTemplate('road');
  formApi.setState({
    schema: buildTemplateFormSchema(
      'road',
      activeTemplate.value,
      useRoadFormSchema(),
    ),
  });
}

function readEffectiveDate(values: Record<string, unknown>) {
  const flat = values[`extraFields.${ROAD_EFF_FIELD}`];
  if (flat !== null && flat !== undefined && String(flat).trim() !== '') {
    return String(flat).trim();
  }
  const nested = (values.extraFields as Record<string, unknown> | undefined)?.[
    ROAD_EFF_FIELD
  ];
  if (nested !== null && nested !== undefined && String(nested).trim() !== '') {
    return String(nested).trim();
  }
  return '';
}

const [Drawer, drawerApi] = useVbenDrawer({
  class: 'w-full sm:w-[720px]',
  async onConfirm() {
    const { valid } = await formApi.validate();
    if (!valid) {
      return;
    }
    const values = await formApi.getValues();
    if (isRenew.value) {
      if (!readEffectiveDate(values)) {
        message.warning($t('page.costLibrary.hint.renewEffRequired'));
        return;
      }
      if (!renewFromId.value) {
        message.error($t('page.costLibrary.hint.renewSourceMissing'));
        return;
      }
      const validRaw =
        values.validDate === null || values.validDate === undefined
          ? ''
          : String(values.validDate).trim();
      if (validRaw) {
        const eff = readEffectiveDate(values);
        if (validRaw < eff) {
          message.warning($t('page.costLibrary.hint.renewValidBeforeEff'));
          return;
        }
      }
    }
    drawerApi.lock();
    try {
      const payload = {
        ...toRoadSavePayload(values),
        extraFields: extractExtraFields(values),
      };
      if (recordId.value) {
        await updateRoadCost(recordId.value, payload);
      } else if (isRenew.value && renewFromId.value) {
        await renewRoadCost(renewFromId.value, payload);
      } else {
        await createRoadCost(payload);
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
    const data = drawerApi.getData<
      RoadCostRecord & {
        aiPrefill?: boolean;
        copyFrom?: boolean;
        renewFrom?: boolean;
        renewFromId?: number;
        template?: CostTableTemplate;
      }
    >();
    recordId.value = data?.aiPrefill ? undefined : data?.id;
    isCopy.value = isCostCopyPayload(data);
    isRenew.value = isCostRenewPayload(data);
    renewFromId.value = data?.renewFromId;
    applyTemplateSchema(data?.template);
    formApi.resetForm();
    void loadSupplierFormulaCache().then(() => {
      if (data?.aiPrefill) {
        const {
          aiPrefill: _ai,
          template: _tpl,
          id: _id,
          status: _status,
          ...fields
        } = data as Record<string, unknown>;
        formApi.setValues({
          extraFields: {},
          ...fields,
        });
        return;
      }
      if (data?.id) {
        formApi.setValues(
          mergeRecordWithExtraFields(rowToRoadFormValues(data)),
        );
        return;
      }
      if ((isCopy.value || isRenew.value) && data) {
        formApi.setValues(
          mergeRecordWithExtraFields(
            rowToRoadFormValues(data as RoadCostRecord),
          ),
        );
        return;
      }
      formApi.setValues({ extraFields: {} });
    });
  },
});
</script>

<template>
  <Drawer :title="getTitle">
    <p
      v-if="isRenew"
      class="text-muted-foreground mb-3 text-sm leading-relaxed"
    >
      {{ $t('page.costLibrary.hint.renewDesc') }}
    </p>
    <Form class="cost-drawer-form px-1" />
  </Drawer>
</template>
