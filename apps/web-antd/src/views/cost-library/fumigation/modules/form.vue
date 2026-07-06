<script lang="ts" setup>
import type { CostTableTemplate, FumigationCostRecord } from '#/api/cost';

import { computed, ref } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';

import { message } from 'ant-design-vue';

import { useVbenForm } from '#/adapter/form';
import { fumigationCostApi } from '#/api/cost';
import { $t } from '#/locales';

import {
  buildTemplateFormSchema,
  extractExtraFields,
  mergeRecordWithExtraFields,
} from '../../shared/build-template-form-schema';
import { getDefaultTemplate } from '../../shared/default-templates';
import { isCostCopyPayload } from '../../shared/drawer-data';
import {
  rowToFumigationFormValues,
  toFumigationSavePayload,
  useFumigationFormSchema,
} from '../form-schema';

const emit = defineEmits<{ success: [] }>();

const recordId = ref<number>();
const isCopy = ref(false);
const activeTemplate = ref<CostTableTemplate>(getDefaultTemplate('fumigation'));

const [Form, formApi] = useVbenForm({
  layout: 'vertical',
  schema: useFumigationFormSchema(),
  showDefaultActions: false,
  wrapperClass: 'grid-cols-1 sm:grid-cols-2',
});

const getTitle = computed(() => {
  if (recordId.value) {
    return $t('page.costLibrary.actions.editRecord');
  }
  if (isCopy.value) {
    return $t('page.costLibrary.actions.copyRecord', [
      $t('page.costLibrary.fumigationRecord'),
    ]);
  }
  return $t('page.costLibrary.actions.createRecord', [
    $t('page.costLibrary.fumigationRecord'),
  ]);
});

function applyTemplateSchema(template?: CostTableTemplate) {
  activeTemplate.value = template ?? getDefaultTemplate('fumigation');
  formApi.setState({
    schema: buildTemplateFormSchema(
      'fumigation',
      activeTemplate.value,
      useFumigationFormSchema(),
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
        ...toFumigationSavePayload(values),
        extraFields: extractExtraFields(values),
      };
      if (recordId.value) {
        await fumigationCostApi.update(recordId.value, payload);
      } else {
        await fumigationCostApi.create(payload);
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
      FumigationCostRecord & {
        copyFrom?: boolean;
        template?: CostTableTemplate;
      }
    >();
    recordId.value = data?.id;
    isCopy.value = isCostCopyPayload(data);
    applyTemplateSchema(data?.template);
    formApi.resetForm();
    if (data?.id) {
      formApi.setValues(
        mergeRecordWithExtraFields(rowToFumigationFormValues(data)),
      );
      return;
    }
    if (isCopy.value && data) {
      formApi.setValues(
        mergeRecordWithExtraFields(
          rowToFumigationFormValues(data as FumigationCostRecord),
        ),
      );
      return;
    }
    formApi.setValues({ extraFields: {} });
  },
});
</script>

<template>
  <Drawer :title="getTitle" class="w-full sm:w-[640px]">
    <Form class="cost-drawer-form px-1" />
  </Drawer>
</template>
