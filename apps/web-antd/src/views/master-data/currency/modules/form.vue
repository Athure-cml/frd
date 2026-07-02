<script lang="ts" setup>
import type { CurrencyApi } from '#/api/currency';

import { computed, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import { message } from 'ant-design-vue';

import { useVbenForm } from '#/adapter/form';
import { createCurrency, updateCurrency } from '#/api/currency';
import { $t } from '#/locales';

import { toCurrencySavePayload, useCurrencyFormSchema } from '../data';

const emit = defineEmits<{ success: [] }>();

const currencyId = ref<number>();
const getTitle = computed(() =>
  currencyId.value
    ? $t('page.masterData.actions.editCurrency')
    : $t('page.masterData.actions.createCurrency'),
);

const [Form, formApi] = useVbenForm({
  layout: 'vertical',
  schema: useCurrencyFormSchema(false),
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
      const payload = toCurrencySavePayload(values);
      if (currencyId.value) {
        await updateCurrency(currencyId.value, payload);
      } else {
        await createCurrency(payload);
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
    const data = modalApi.getData<CurrencyApi.Currency>();
    formApi.resetForm();
    currencyId.value = data?.id;
    formApi.setState({
      schema: useCurrencyFormSchema(!!currencyId.value),
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
