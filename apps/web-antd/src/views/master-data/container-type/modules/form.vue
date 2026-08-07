<script lang="ts" setup>
import type { ContainerTypeApi } from '#/api/master-data/container-type';

import { computed, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import { message } from 'ant-design-vue';

import { useVbenForm } from '#/adapter/form';
import {
  createContainerType,
  updateContainerType,
} from '#/api/master-data/container-type';
import { $t } from '#/locales';

import {
  toContainerTypeSavePayload,
  useContainerTypeFormSchema,
} from '../data';

const emit = defineEmits<{ success: [] }>();

const containerTypeId = ref<number>();
const getTitle = computed(() =>
  containerTypeId.value
    ? $t('page.masterData.actions.editContainerType')
    : $t('page.masterData.actions.createContainerType'),
);

const [Form, formApi] = useVbenForm({
  layout: 'vertical',
  schema: useContainerTypeFormSchema(false),
  showDefaultActions: false,
  wrapperClass: 'grid-cols-1 sm:grid-cols-2',
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
      const payload = toContainerTypeSavePayload(values);
      await (containerTypeId.value
        ? updateContainerType(containerTypeId.value, payload)
        : createContainerType(payload));
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
    const data = modalApi.getData<ContainerTypeApi.ContainerType>();
    formApi.resetForm();
    containerTypeId.value = data?.id;
    formApi.setState({
      schema: useContainerTypeFormSchema(!!containerTypeId.value),
    });
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
