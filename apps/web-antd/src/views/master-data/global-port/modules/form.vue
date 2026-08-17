<script lang="ts" setup>
import type { GlobalPortApi } from '#/api/master-data/global-port';

import { computed, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import { message } from 'ant-design-vue';

import { useVbenForm } from '#/adapter/form';
import {
  createGlobalPort,
  updateGlobalPort,
} from '#/api/master-data/global-port';
import { $t } from '#/locales';

import { toGlobalPortSavePayload, useGlobalPortFormSchema } from '../data';

const emit = defineEmits<{ success: [] }>();

const recordId = ref<number>();
const getTitle = computed(() =>
  recordId.value
    ? $t('page.masterData.actions.editGlobalPort')
    : $t('page.masterData.actions.createGlobalPort'),
);

const [Form, formApi] = useVbenForm({
  layout: 'vertical',
  schema: useGlobalPortFormSchema(false),
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
      const payload = toGlobalPortSavePayload(values);
      await (recordId.value
        ? updateGlobalPort(recordId.value, payload)
        : createGlobalPort(payload));
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
    const data = modalApi.getData<GlobalPortApi.GlobalPort>();
    formApi.resetForm();
    recordId.value = data?.id;
    formApi.setState({ schema: useGlobalPortFormSchema(!!recordId.value) });
    if (data) {
      formApi.setValues(data);
    }
  },
});
</script>

<template>
  <Modal :title="getTitle" class="w-[560px]">
    <Form class="px-1" />
  </Modal>
</template>
