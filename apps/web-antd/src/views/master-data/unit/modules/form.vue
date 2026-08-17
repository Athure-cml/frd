<script lang="ts" setup>
import type { UnitApi } from '#/api/unit';

import { computed, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import { message } from 'ant-design-vue';

import { useVbenForm } from '#/adapter/form';
import { createUnit, updateUnit } from '#/api/unit';
import { $t } from '#/locales';

import { toUnitSavePayload, useUnitFormSchema } from '../data';

const emit = defineEmits<{ success: [] }>();

const unitId = ref<number>();
const getTitle = computed(() =>
  unitId.value
    ? $t('page.masterData.actions.editUnit')
    : $t('page.masterData.actions.createUnit'),
);

const [Form, formApi] = useVbenForm({
  layout: 'vertical',
  schema: useUnitFormSchema(false),
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
      const payload = toUnitSavePayload(values);
      await (unitId.value
        ? updateUnit(unitId.value, payload)
        : createUnit(payload));
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
    const data = modalApi.getData<UnitApi.Unit>();
    formApi.resetForm();
    unitId.value = data?.id;
    formApi.setState({
      schema: useUnitFormSchema(!!unitId.value),
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
