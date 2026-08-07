<script lang="ts" setup>
import type { AgentApi } from '#/api/agent';

import { computed, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import { message } from 'ant-design-vue';

import { useVbenForm } from '#/adapter/form';
import { createAgent, updateAgent } from '#/api/agent';
import { $t } from '#/locales';
import { useInternalCodeVisibility } from '#/utils/internal-code-access';

import { toAgentSavePayload, useAgentFormSchema } from '../data';

const emit = defineEmits<{ success: [] }>();

const { canViewInternalCodes } = useInternalCodeVisibility();

const agentId = ref<number>();
const isEdit = computed(() => !!agentId.value);
const getTitle = computed(() =>
  isEdit.value
    ? $t('page.agent.actions.edit')
    : $t('page.agent.actions.create'),
);

const [Form, formApi] = useVbenForm({
  layout: 'vertical',
  schema: useAgentFormSchema(false, canViewInternalCodes.value),
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
      const payload = toAgentSavePayload(values);
      await (agentId.value
        ? updateAgent(agentId.value, payload)
        : createAgent(payload));
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
    const data = modalApi.getData<AgentApi.Agent>();
    formApi.setState({
      schema: useAgentFormSchema(!!data?.id, canViewInternalCodes.value),
    });
    formApi.resetForm();
    agentId.value = data?.id;
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
