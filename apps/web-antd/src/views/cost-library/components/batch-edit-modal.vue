<script lang="ts" setup>
import type { VbenFormSchema } from '#/adapter/form';
import type { CostMode, CostTableTemplate } from '#/api/cost';

import { ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import { Button, message } from 'ant-design-vue';

import { useVbenForm } from '#/adapter/form';
import { batchUpdateRoadCost, fumigationCostApi, seaCostApi } from '#/api/cost';
import { BATCH_COPY_PREVIEW_LIMIT } from '#/api/import-request';
import { $t } from '#/locales';

import { joinContainerTypes } from '../shared/freight-schema';
import BatchCopyPreviewModal from './batch-copy-preview-modal.vue';

const props = withDefaults(
  defineProps<{
    mode: CostMode;
    schema: VbenFormSchema[];
    template?: CostTableTemplate;
    title: string;
    wide?: boolean;
  }>(),
  { template: undefined, wide: false },
);

const emit = defineEmits<{ success: [] }>();

const selectedIds = ref<number[]>([]);
const submitting = ref(false);
const skipResetOnClose = ref(false);
const previewModalRef = ref<InstanceType<typeof BatchCopyPreviewModal>>();

const [Form, formApi] = useVbenForm({
  layout: 'vertical',
  schema: props.schema,
  showDefaultActions: false,
  wrapperClass: props.wide ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1',
});

const [Modal, modalApi] = useVbenModal({
  footer: false,
  onOpenChange(isOpen) {
    if (!isOpen && !skipResetOnClose.value) {
      formApi.resetForm();
      selectedIds.value = [];
    }
    skipResetOnClose.value = false;
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

function batchUpdate(payload: {
  fields: Record<string, unknown>;
  ids: number[];
  previewLimit?: number;
  previewOnly?: boolean;
}) {
  if (props.mode === 'road') {
    return batchUpdateRoadCost(payload);
  }
  if (props.mode === 'sea') {
    return seaCostApi.batchUpdate(payload);
  }
  return fumigationCostApi.batchUpdate(payload);
}

async function onConfirm() {
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
    const previewRequest = {
      fields,
      ids: selectedIds.value,
      previewLimit: BATCH_COPY_PREVIEW_LIMIT,
      previewOnly: true,
    };
    const result = await batchUpdate(previewRequest);
    if (result.items.length === 0) {
      message.warning($t('page.costLibrary.hint.batchUpdateSuccess', [0]));
      return;
    }
    skipResetOnClose.value = true;
    modalApi.close();
    previewModalRef.value?.open({
      items: result.items,
      operation: 'update',
      request: {
        fields,
        ids: selectedIds.value,
        previewOnly: false,
      },
      total: result.total ?? result.updated,
    });
  } finally {
    submitting.value = false;
    modalApi.unlock();
  }
}

function onPreviewSuccess() {
  emit('success');
}

function onPreviewBack() {
  previewModalRef.value?.close();
  modalApi.open();
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
    <div class="mt-6 flex flex-wrap justify-end gap-2">
      <Button :disabled="submitting" @click="modalApi.close()">
        {{ $t('common.cancel') }}
      </Button>
      <Button :loading="submitting" type="primary" @click="onConfirm">
        {{ $t('common.confirm') }}
      </Button>
    </div>
  </Modal>
  <BatchCopyPreviewModal
    ref="previewModalRef"
    :mode="mode"
    :template="template"
    @back="onPreviewBack"
    @success="onPreviewSuccess"
  />
</template>
