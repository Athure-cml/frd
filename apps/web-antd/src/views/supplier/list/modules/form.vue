<script lang="ts" setup>
import type { SupplierCategory } from '../data';

import type { SupplierApi } from '#/api/supplier';

import { computed, ref } from 'vue';
import { useRoute } from 'vue-router';

import { useVbenModal } from '@vben/common-ui';

import { message } from 'ant-design-vue';

import { useVbenForm } from '#/adapter/form';
import {
  createSupplier,
  getSupplierTypeList,
  updateSupplier,
} from '#/api/supplier';
import { $t } from '#/locales';
import { useInternalCodeVisibility } from '#/utils/internal-code-access';

import {
  supportsTypes,
  toSupplierSavePayload,
  useSupplierFormSchema,
} from '../data';

const emit = defineEmits<{ success: [] }>();

const route = useRoute();
const { canViewInternalCodes } = useInternalCodeVisibility();

const category = computed<SupplierCategory>(() => {
  const raw = String(route.meta.supplierCategory ?? 'TRUCK').toUpperCase();
  if (
    raw === 'FUMIGATION' ||
    raw === 'YARD' ||
    raw === 'OTHER' ||
    raw === 'TRUCK'
  ) {
    return raw;
  }
  return 'TRUCK';
});

const supplierId = ref<number>();
const typeOptions = ref<Array<{ label: string; value: string }>>([]);
const isEdit = computed(() => !!supplierId.value);
const getTitle = computed(() =>
  isEdit.value
    ? $t('page.supplier.actions.edit')
    : $t('page.supplier.actions.create'),
);

async function loadTypeOptions() {
  if (!supportsTypes(category.value)) {
    typeOptions.value = [];
    return;
  }
  const list = await getSupplierTypeList({ enabledOnly: true });
  typeOptions.value = list.map((item) => ({
    label: item.name,
    value: String(item.id),
  }));
}

const [Form, formApi] = useVbenForm({
  layout: 'vertical',
  schema: useSupplierFormSchema(
    category.value,
    false,
    canViewInternalCodes.value,
    [],
  ),
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
      const payload = toSupplierSavePayload(category.value, values);
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
  async onOpenChange(isOpen) {
    if (!isOpen) {
      return;
    }
    await loadTypeOptions();
    const data = modalApi.getData<SupplierApi.Supplier>();
    formApi.setState({
      schema: useSupplierFormSchema(
        category.value,
        !!data?.id,
        canViewInternalCodes.value,
        typeOptions.value,
      ),
    });
    formApi.resetForm();
    supplierId.value = data?.id;
    if (data) {
      formApi.setValues({
        ...data,
        types: (data.types ?? []).map(String),
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
