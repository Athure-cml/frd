<script lang="ts" setup>
import type { CustomerApi } from '#/api/customer';

import { computed, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import { message } from 'ant-design-vue';

import { useVbenForm } from '#/adapter/form';
import { createCustomer, updateCustomer } from '#/api/customer';
import { $t } from '#/locales';
import { useInternalCodeVisibility } from '#/utils/internal-code-access';

import { toCustomerSavePayload, useCustomerFormSchema } from '../data';

const emit = defineEmits<{ success: [] }>();

const { canViewInternalCodes } = useInternalCodeVisibility();

const customerId = ref<number>();
const isEdit = computed(() => !!customerId.value);
const getTitle = computed(() =>
  isEdit.value
    ? $t('page.customer.actions.edit')
    : $t('page.customer.actions.create'),
);

const [Form, formApi] = useVbenForm({
  layout: 'vertical',
  schema: useCustomerFormSchema(false, canViewInternalCodes.value),
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
      const payload = toCustomerSavePayload(values);
      if (customerId.value) {
        await updateCustomer(customerId.value, payload);
      } else {
        await createCustomer(payload);
      }
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
    const data = modalApi.getData<CustomerApi.Customer>();
    formApi.setState({
      schema: useCustomerFormSchema(!!data?.id, canViewInternalCodes.value),
    });
    formApi.resetForm();
    customerId.value = data?.id;
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
