<script lang="ts" setup>
import type { VbenFormSchema } from '#/adapter/form';

import { ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import { Button, message } from 'ant-design-vue';

import { useVbenForm } from '#/adapter/form';
import { $t } from '#/locales';

const props = defineProps<{
  batchUpdateFn: (
    ids: number[],
    fields: Record<string, unknown>,
  ) => Promise<unknown>;
  schema: VbenFormSchema[];
  title: string;
}>();

const emit = defineEmits<{ success: [] }>();

const selectedIds = ref<number[]>([]);
const submitting = ref(false);

const [Form, formApi] = useVbenForm({
  layout: 'vertical',
  schema: props.schema,
  showDefaultActions: false,
  wrapperClass: 'grid-cols-1',
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

async function handleConfirm() {
  if (selectedIds.value.length === 0) {
    return;
  }
  const values = await formApi.getValues();
  const fields = Object.fromEntries(
    Object.entries(values).filter(
      ([, value]) => value !== undefined && value !== null && value !== '',
    ),
  );
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
  <Modal :title="title" class="w-full sm:w-[480px]">
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
