<script lang="ts" setup>
import type { QuoteRuleApi } from '#/api/quote-rule';

import { computed, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import { message } from 'ant-design-vue';

import { useVbenForm } from '#/adapter/form';
import { createQuoteRule, updateQuoteRule } from '#/api/quote-rule';
import { $t } from '#/locales';

import {
  cifRateToPercent,
  toQuoteRuleSavePayload,
  useQuoteRuleFormSchema,
} from '../data';

const emit = defineEmits<{ success: [] }>();

const ruleId = ref<number>();
const getTitle = computed(() =>
  ruleId.value
    ? $t('page.masterData.actions.editQuoteRule')
    : $t('page.masterData.actions.createQuoteRule'),
);

const [Form, formApi] = useVbenForm({
  commonConfig: {
    componentProps: {
      class: 'w-full',
    },
  },
  layout: 'vertical',
  schema: useQuoteRuleFormSchema(),
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
      const payload = toQuoteRuleSavePayload(values);
      await (ruleId.value
        ? updateQuoteRule(ruleId.value, payload)
        : createQuoteRule(payload));
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
    const data = modalApi.getData<QuoteRuleApi.QuoteRule>();
    formApi.resetForm();
    ruleId.value = data?.id;
    if (data) {
      formApi.setValues({
        ...data,
        cifRate: cifRateToPercent(data.cifRate),
      });
    }
  },
});
</script>

<template>
  <Modal :title="getTitle" class="w-[680px]">
    <Form class="system-drawer-form system-role-form px-1" />
  </Modal>
</template>
