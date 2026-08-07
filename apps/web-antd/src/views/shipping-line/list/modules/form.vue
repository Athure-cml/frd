<script lang="ts" setup>
import type { ShippingLineApi } from '#/api/shipping-line';

import { computed, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import { message } from 'ant-design-vue';

import { useVbenForm } from '#/adapter/form';
import { createShippingLine, updateShippingLine } from '#/api/shipping-line';
import { $t } from '#/locales';
import { useInternalCodeVisibility } from '#/utils/internal-code-access';

import { toShippingLineSavePayload, useShippingLineFormSchema } from '../data';

const emit = defineEmits<{ success: [] }>();

const { canViewInternalCodes } = useInternalCodeVisibility();

const shippingLineId = ref<number>();
const isEdit = computed(() => !!shippingLineId.value);
const getTitle = computed(() =>
  isEdit.value
    ? $t('page.shippingLine.actions.edit')
    : $t('page.shippingLine.actions.create'),
);

const [Form, formApi] = useVbenForm({
  layout: 'vertical',
  schema: useShippingLineFormSchema(false, canViewInternalCodes.value),
  showDefaultActions: false,
  wrapperClass: 'grid-cols-1 md:grid-cols-2',
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
      const payload = toShippingLineSavePayload(values);
      await (shippingLineId.value
        ? updateShippingLine(shippingLineId.value, payload)
        : createShippingLine(payload));
      message.success($t('ui.actionMessage.operationSuccess'));
      emit('success');
      modalApi.close();
    } finally {
      modalApi.lock(false);
    }
  },
  onOpenChange(isOpen) {
    if (!isOpen) {
      return;
    }
    const data = modalApi.getData<ShippingLineApi.ShippingLine>();
    formApi.setState({
      schema: useShippingLineFormSchema(!!data?.id, canViewInternalCodes.value),
    });
    formApi.resetForm();
    shippingLineId.value = data?.id;
    if (data) {
      formApi.setValues(data);
    }
  },
});
</script>

<template>
  <Modal class="w-[640px]" :title="getTitle">
    <Form class="px-1" />
  </Modal>
</template>
