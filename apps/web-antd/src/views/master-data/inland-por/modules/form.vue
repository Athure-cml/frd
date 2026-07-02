<script lang="ts" setup>
import type { InlandPorApi } from '#/api/master-data/inland-por';

import { computed, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import { message } from 'ant-design-vue';

import { useVbenForm } from '#/adapter/form';
import { createInlandPor, updateInlandPor } from '#/api/master-data/inland-por';
import { $t } from '#/locales';

import { toInlandPorSavePayload, useInlandPorFormSchema } from '../data';

const emit = defineEmits<{ success: [] }>();

const recordId = ref<number>();
const getTitle = computed(() =>
  recordId.value
    ? $t('page.masterData.actions.editInlandPor')
    : $t('page.masterData.actions.createInlandPor'),
);

const [Form, formApi] = useVbenForm({
  layout: 'vertical',
  schema: useInlandPorFormSchema(),
  showDefaultActions: false,
  wrapperClass: 'grid-cols-1',
});

const [Modal, modalApi] = useVbenModal({
  async onConfirm() {
    const { valid } = await formApi.validate();
    if (!valid) {
      return;
    }
    modalApi.lock();
    try {
      const values = await formApi.getValues();
      const payload = toInlandPorSavePayload(values);
      if (recordId.value) {
        await updateInlandPor(recordId.value, payload);
      } else {
        await createInlandPor(payload);
      }
      message.success($t('ui.actionMessage.operationSuccess'));
      emit('success');
      modalApi.close();
    } finally {
      modalApi.unlock();
    }
  },
  onOpenChange(isOpen) {
    if (!isOpen) {
      return;
    }
    const data = modalApi.getData<InlandPorApi.InlandPor>();
    formApi.resetForm();
    recordId.value = data?.id;
    if (data) {
      formApi.setValues(data);
    }
  },
});
</script>

<template>
  <Modal :title="getTitle" class="w-[480px]">
    <Form class="px-1" />
  </Modal>
</template>
