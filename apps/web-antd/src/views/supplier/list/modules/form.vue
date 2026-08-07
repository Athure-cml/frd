<script lang="ts" setup>
import type { SupplierApi } from '#/api/supplier';

import { computed, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import { message } from 'ant-design-vue';

import { useVbenForm } from '#/adapter/form';
import { createSupplier, updateSupplier } from '#/api/supplier';
import { $t } from '#/locales';
import { useInternalCodeVisibility } from '#/utils/internal-code-access';

import { toSupplierSavePayload, useSupplierFormSchema } from '../data';

const emit = defineEmits<{ success: [] }>();

const { canViewInternalCodes } = useInternalCodeVisibility();

const supplierId = ref<number>();
const isEdit = computed(() => !!supplierId.value);
const getTitle = computed(() =>
  isEdit.value
    ? $t('page.supplier.actions.edit')
    : $t('page.supplier.actions.create'),
);

const [Form, formApi] = useVbenForm({
  layout: 'vertical',
  schema: useSupplierFormSchema(false, canViewInternalCodes.value),
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
      const payload = toSupplierSavePayload(values);
      await (supplierId.value
        ? updateSupplier(supplierId.value, payload)
        : createSupplier(payload));
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
    const data = modalApi.getData<SupplierApi.Supplier>();
    formApi.setState({
      schema: useSupplierFormSchema(!!data?.id, canViewInternalCodes.value),
    });
    formApi.resetForm();
    supplierId.value = data?.id;
    if (data) {
      formApi.setValues({
        ...data,
        types: data.types ?? [],
      });
    } else {
      formApi.setValues({
        status: 1,
        types: [],
      });
    }
  },
});
</script>

<template>
  <Modal class="w-[880px]" :title="getTitle">
    <Form class="px-1" />
  </Modal>
</template>
