<script lang="ts" setup>
import type { CostTableTemplate, RoadCostRecord } from '#/api/cost';

import { computed, ref } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';

import { message } from 'ant-design-vue';

import { useVbenForm } from '#/adapter/form';
import { createRoadCost, updateRoadCost } from '#/api/cost';
import { $t } from '#/locales';

import {
  buildTemplateFormSchema,
  extractExtraFields,
  mergeRecordWithExtraFields,
} from '../../shared/build-template-form-schema';
import { getDefaultTemplate } from '../../shared/default-templates';
import {
  rowToRoadFormValues,
  toRoadSavePayload,
  useRoadFormSchema,
} from '../form-schema';

const emit = defineEmits<{ success: [] }>();

const recordId = ref<number>();
const activeTemplate = ref<CostTableTemplate>(getDefaultTemplate('road'));

const [Form, formApi] = useVbenForm({
  layout: 'vertical',
  schema: useRoadFormSchema(),
  showDefaultActions: false,
  wrapperClass: 'grid-cols-1 sm:grid-cols-2',
});

const getTitle = computed(() =>
  recordId.value
    ? $t('page.costLibrary.actions.editRecord')
    : $t('page.costLibrary.actions.createRecord', [
        $t('page.costLibrary.roadRecord'),
      ]),
);

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

const [Drawer, drawerApi] = useVbenDrawer({
  async onConfirm() {
    const { valid } = await formApi.validate();
    if (!valid) {
      return;
    }
    drawerApi.lock();
    try {
      const values = await formApi.getValues();
      const payload = {
        ...toRoadSavePayload(values),
        extraFields: extractExtraFields(values),
      };
      if (recordId.value) {
        await updateRoadCost(recordId.value, payload);
      } else {
        await createRoadCost(payload);
      }
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
    const data = drawerApi.getData<
      RoadCostRecord & { template?: CostTableTemplate }
    >();
    recordId.value = data?.id;
    applyTemplateSchema(data?.template);
    formApi.resetForm();
    if (data?.id) {
      formApi.setValues(mergeRecordWithExtraFields(rowToRoadFormValues(data)));
      return;
    }
    formApi.setValues({ extraFields: {} });
  },
});
</script>

<template>
  <Drawer :title="getTitle">
    <Form class="cost-drawer-form px-1" />
  </Drawer>
</template>
