<script lang="ts" setup>
import type { ExchangeRateApi } from '#/api/exchange-rate';

import { computed, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import { message } from 'ant-design-vue';

import { useVbenForm } from '#/adapter/form';
import { createExchangeRate, updateExchangeRate } from '#/api/exchange-rate';
import { $t } from '#/locales';

import { toExchangeRateSavePayload, useExchangeRateFormSchema } from '../data';

const emit = defineEmits<{ success: [] }>();

const rateId = ref<number>();
const getTitle = computed(() =>
  rateId.value
    ? $t('page.masterData.actions.editExchangeRate')
    : $t('page.masterData.actions.createExchangeRate'),
);

const [Form, formApi] = useVbenForm({
  layout: 'vertical',
  schema: useExchangeRateFormSchema(),
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
      const payload = toExchangeRateSavePayload(values);
      if (rateId.value) {
        await updateExchangeRate(rateId.value, payload);
      } else {
        await createExchangeRate(payload);
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
    const data = modalApi.getData<ExchangeRateApi.ExchangeRate>();
    formApi.resetForm();
    rateId.value = data?.id;
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
