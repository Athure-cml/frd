<script lang="ts" setup>
import type { QuoteLibraryMode } from '../shared/quote-library-columns';

import { ref } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';

import { Button, message } from 'ant-design-vue';

import { useVbenForm } from '#/adapter/form';
import {
  getQuoteLibraryEditContext,
  resetQuoteLibraryRecord,
  updateQuoteLibraryRecord,
} from '#/api/quote/library';
import { $t } from '#/locales';

import {
  buildQuoteLibraryFeeSchema,
  normalizeQuoteLibraryFeeValues,
} from '../shared/quote-library-fee-fields';

const props = defineProps<{
  mode: QuoteLibraryMode;
}>();

const emit = defineEmits<{ success: [] }>();

const recordId = ref<number>();
const submitting = ref(false);
const resetting = ref(false);

const [Form, formApi] = useVbenForm({
  layout: 'vertical',
  showDefaultActions: false,
  wrapperClass: 'grid-cols-1 sm:grid-cols-2',
});

const [Drawer, drawerApi] = useVbenDrawer({
  class: 'w-full sm:w-[720px]',
  destroyOnClose: true,
  onConfirm: onSubmit,
  onOpenChange(isOpen) {
    if (!isOpen) {
      recordId.value = undefined;
      formApi.resetForm();
    }
  },
});

async function applyEditContext(
  context: Awaited<ReturnType<typeof getQuoteLibraryEditContext>>,
) {
  formApi.setState({
    schema: buildQuoteLibraryFeeSchema(props.mode, context),
  });
  await formApi.setValues(context.values);
}

async function open(id: number) {
  recordId.value = id;
  drawerApi.setState({ loading: true });
  drawerApi.open();
  try {
    const context = await getQuoteLibraryEditContext(props.mode, id);
    await applyEditContext(context);
  } catch {
    drawerApi.close();
  } finally {
    drawerApi.setState({ loading: false });
  }
}

async function onReset() {
  if (recordId.value === undefined || resetting.value) {
    return;
  }
  resetting.value = true;
  drawerApi.lock();
  try {
    const context = await resetQuoteLibraryRecord(props.mode, recordId.value);
    await applyEditContext(context);
    message.success($t('page.quote.library.hint.resetSuccess'));
    emit('success');
  } finally {
    resetting.value = false;
    drawerApi.unlock();
  }
}

async function onSubmit() {
  if (recordId.value === undefined) {
    return;
  }
  const values = await formApi.getValues();
  const fields = normalizeQuoteLibraryFeeValues(values);
  if (Object.keys(fields).length === 0) {
    message.warning($t('page.quote.library.hint.feeEmpty'));
    return;
  }
  submitting.value = true;
  drawerApi.lock();
  try {
    await updateQuoteLibraryRecord(props.mode, recordId.value, fields);
    message.success($t('ui.actionMessage.operationSuccess'));
    drawerApi.close();
    emit('success');
  } finally {
    submitting.value = false;
    drawerApi.unlock();
  }
}

defineExpose({ open });
</script>

<template>
  <Drawer
    :confirm-loading="submitting"
    :title="$t('page.quote.library.editTitle')"
  >
    <p class="mb-4 text-sm text-muted-foreground">
      {{ $t('page.quote.library.hint.editFeesOnly') }}
    </p>
    <Form class="cost-drawer-form px-1" />
    <template #prepend-footer>
      <Button :disabled="submitting" :loading="resetting" @click="onReset">
        {{ $t('common.reset') }}
      </Button>
    </template>
  </Drawer>
</template>
