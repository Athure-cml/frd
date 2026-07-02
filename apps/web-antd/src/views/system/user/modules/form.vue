<script lang="ts" setup>
import type { SystemUserApi } from '#/api/system/user';

import { computed, nextTick, ref } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';

import { message } from 'ant-design-vue';

import { useVbenForm } from '#/adapter/form';
import { createUser, updateUser } from '#/api/system/user';
import { $t } from '#/locales';

import {
  rowToUserFormValues,
  toUserCreatePayload,
  toUserUpdatePayload,
  useUserFormSchema,
} from '../data';

const emit = defineEmits<{ success: [] }>();

const userId = ref<number>();
const editRow = ref<SystemUserApi.SystemUser>();

const [Form, formApi] = useVbenForm({
  layout: 'vertical',
  schema: useUserFormSchema(false),
  showDefaultActions: false,
  wrapperClass: 'grid-cols-1',
});

const getTitle = computed(() =>
  userId.value
    ? $t('page.system.actions.editUser')
    : $t('page.system.actions.createUser'),
);

const [Drawer, drawerApi] = useVbenDrawer({
  async onConfirm() {
    const { valid } = await formApi.validate();
    if (!valid) {
      return;
    }
    drawerApi.lock();
    try {
      const values = await formApi.getValues();
      if (userId.value && editRow.value) {
        await updateUser(
          userId.value,
          toUserUpdatePayload(values, editRow.value),
        );
      } else {
        await createUser(toUserCreatePayload(values));
      }
      message.success($t('ui.actionMessage.operationSuccess'));
      emit('success');
      drawerApi.close();
    } finally {
      drawerApi.unlock();
    }
  },
  async onOpenChange(isOpen) {
    if (!isOpen) {
      return;
    }
    const data = drawerApi.getData<SystemUserApi.SystemUser>();
    userId.value = data?.id;
    editRow.value = data;
    formApi.setState({
      schema: useUserFormSchema(!!userId.value),
    });
    formApi.resetForm();
    await nextTick();
    if (data) {
      formApi.setValues(rowToUserFormValues(data));
    }
  },
});
</script>

<template>
  <Drawer :title="getTitle">
    <Form class="px-1" />
  </Drawer>
</template>
