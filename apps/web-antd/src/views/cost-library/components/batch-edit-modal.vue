<script lang="ts" setup>
import type { VbenFormSchema } from '#/adapter/form';

import { ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import { Button, message } from 'ant-design-vue';

import { useVbenForm } from '#/adapter/form';
import { $t } from '#/locales';

import { joinContainerTypes } from '../shared/freight-schema';

const props = withDefaults(
  defineProps<{
    batchUpdateFn: (
      ids: number[],
      fields: Record<string, unknown>,
    ) => Promise<unknown>;
    schema: VbenFormSchema[];
    title: string;
    /** 海运等同批量复制：双列宽弹窗 */
    wide?: boolean;
  }>(),
  { wide: false },
);

const emit = defineEmits<{ success: [] }>();

const selectedIds = ref<number[]>([]);
const submitting = ref(false);

const [Form, formApi] = useVbenForm({
  layout: 'vertical',
  schema: props.schema,
  showDefaultActions: false,
  wrapperClass: props.wide ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1',
});

const [Modal, modalApi] = useVbenModal({
  async onConfirm() {
    await handleConfirm();
  },
  onOpenChange(isOpen) {
    if (!isOpen) {
      formApi.resetForm();
      selectedIds.value = [];
    }
  },
});

function normalizeBatchFields(values: Record<string, unknown>) {
  const fields: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(values)) {
    if (key.endsWith('Divider')) {
      continue;
    }
    if (value === undefined || value === null || value === '') {
      continue;
    }
    if (key === 'containerType') {
      const joined = joinContainerTypes(value as string | string[]);
      if (joined) {
        fields.containerType = joined;
      }
      continue;
    }
    fields[key] = value;
  }
  return fields;
}

async function handleConfirm() {
  if (selectedIds.value.length === 0) {
    return;
  }
  const values = await formApi.getValues();
  const fields = normalizeBatchFields(values);
  if (Object.keys(fields).length === 0) {
    message.warning($t('page.costLibrary.hint.batchEmpty'));
    return;
  }
  submitting.value = true;
  modalApi.lock();
  try {
    await props.batchUpdateFn(selectedIds.value, fields);
    message.success($t('ui.actionMessage.operationSuccess'));
    emit('success');
    modalApi.close();
  } finally {
    submitting.value = false;
    modalApi.unlock();
  }
}

function open(ids: number[]) {
  selectedIds.value = ids;
  modalApi.open();
}

defineExpose({ open });
</script>

<template>
  <Modal
    :class="wide ? 'w-full sm:w-[720px]' : 'w-full sm:w-[480px]'"
    :title="title"
  >
    <p class="mb-1 text-sm font-medium text-foreground">
      {{ $t('page.costLibrary.hint.batchSelected', [selectedIds.length]) }}
    </p>
    <p class="mb-4 text-sm text-muted-foreground">
      {{ $t('page.costLibrary.hint.batchFill') }}
    </p>
    <Form class="cost-drawer-form px-1" />
    <template #footer>
      <Button @click="modalApi.close()">{{ $t('common.cancel') }}</Button>
      <Button :loading="submitting" type="primary" @click="handleConfirm">
        {{ $t('common.confirm') }}
      </Button>
    </template>
  </Modal>
</template>
