<script lang="ts" setup>
import type { QuoteLibraryMode } from '../shared/quote-library-columns';

import { ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import { Button, message } from 'ant-design-vue';

import { useVbenForm } from '#/adapter/form';
import { batchUpdateQuoteLibrary } from '#/api/quote/library';
import { $t } from '#/locales';

import {
  buildQuoteLibraryBatchFeeSchema,
  normalizeQuoteLibraryFeeValues,
} from '../shared/quote-library-fee-fields';

const props = defineProps<{
  mode: QuoteLibraryMode;
}>();

const emit = defineEmits<{ success: [] }>();

const selectedIds = ref<number[]>([]);
const submitting = ref(false);

const [Form, formApi] = useVbenForm({
  layout: 'vertical',
  schema: buildQuoteLibraryBatchFeeSchema(props.mode),
  showDefaultActions: false,
  wrapperClass: 'grid-cols-1 sm:grid-cols-2',
});

const [Modal, modalApi] = useVbenModal({
  footer: false,
  onOpenChange(isOpen) {
    if (!isOpen) {
      formApi.resetForm();
      selectedIds.value = [];
    }
  },
});

async function onConfirm() {
  if (selectedIds.value.length === 0) {
    return;
  }
  const values = await formApi.getValues();
  const fields = normalizeQuoteLibraryFeeValues(values);
  if (Object.keys(fields).length === 0) {
    message.warning($t('page.costLibrary.hint.batchEmpty'));
    return;
  }

  submitting.value = true;
  modalApi.lock();
  try {
    const result = await batchUpdateQuoteLibrary(props.mode, {
      fields,
      ids: selectedIds.value,
    });
    message.success(
      $t('page.costLibrary.hint.batchUpdateSuccess', [result.updated]),
    );
    modalApi.close();
    emit('success');
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
    class="w-full sm:w-[720px]"
    :title="$t('page.quote.library.batchEditTitle')"
  >
    <p class="mb-1 text-sm font-medium text-foreground">
      {{ $t('page.costLibrary.hint.batchSelected', [selectedIds.length]) }}
    </p>
    <p class="mb-4 text-sm text-muted-foreground">
      {{ $t('page.quote.library.hint.batchFillFees') }}
    </p>
    <Form class="cost-drawer-form px-1" />
    <div class="mt-6 flex flex-wrap justify-end gap-2">
      <Button :disabled="submitting" @click="modalApi.close()">
        {{ $t('common.cancel') }}
      </Button>
      <Button :loading="submitting" type="primary" @click="onConfirm">
        {{ $t('common.confirm') }}
      </Button>
    </div>
  </Modal>
</template>
