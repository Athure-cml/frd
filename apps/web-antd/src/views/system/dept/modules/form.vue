<script lang="ts" setup>
import type { SystemDeptApi } from '#/api/system/dept';

import { computed, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import { message } from 'ant-design-vue';

import { useVbenForm } from '#/adapter/form';
import { createDepartment, updateDepartment } from '#/api/system/dept';
import { $t } from '#/locales';

import { toDeptSavePayload, useDeptFormSchema } from '../data';

const emit = defineEmits<{ success: [] }>();

const deptId = ref<number>();
const getTitle = computed(() =>
  deptId.value
    ? $t('page.system.actions.editDept')
    : $t('page.system.actions.createDept'),
);

const [Form, formApi] = useVbenForm({
  layout: 'vertical',
  schema: useDeptFormSchema(),
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
      const payload = toDeptSavePayload(values);
      if (deptId.value) {
        await updateDepartment(deptId.value, payload);
      } else {
        await createDepartment(payload);
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
    const data = modalApi.getData<SystemDeptApi.Department>();
    formApi.resetForm();
    deptId.value = data?.id;
    if (data) {
      formApi.setValues({
        ...data,
        parentId: data.parentId === 0 ? undefined : data.parentId,
      });
      formApi.updateSchema([
        {
          componentProps: { disabled: !!deptId.value },
          fieldName: 'code',
        },
      ]);
    } else {
      formApi.updateSchema([
        {
          componentProps: { disabled: false },
          fieldName: 'code',
        },
      ]);
    }
  },
});
</script>

<template>
  <Modal :title="getTitle" class="w-[480px]">
    <Form class="px-1" />
  </Modal>
</template>
