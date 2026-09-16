<script lang="ts" setup>
import type { CostTableTemplate } from '#/api/cost';

import { ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import { Button, message } from 'ant-design-vue';

import { useVbenForm } from '#/adapter/form';
import { getRoadCost } from '#/api/cost';
import { getSupplierList } from '#/api/supplier';
import { $t } from '#/locales';

import { useRoadBatchRenewSchema } from '../road/form-schema';
import {
  buildRoadRenewPreviewPlan,
  toSupplierFormulaLookup,
} from '../road/road-batch-renew';
import BatchCopyPreviewModal from './batch-copy-preview-modal.vue';

const props = defineProps<{
  template?: CostTableTemplate;
}>();

const emit = defineEmits<{ success: [] }>();

const selectedIds = ref<number[]>([]);
const submitting = ref(false);
const skipResetOnClose = ref(false);
const previewModalRef = ref<InstanceType<typeof BatchCopyPreviewModal>>();

const [Form, formApi] = useVbenForm({
  layout: 'vertical',
  schema: useRoadBatchRenewSchema(),
  showDefaultActions: false,
  wrapperClass: 'grid-cols-1 sm:grid-cols-2',
});

const [Modal, modalApi] = useVbenModal({
  class: 'w-full sm:w-[860px]',
  footer: false,
  onOpenChange(isOpen) {
    if (!isOpen && !skipResetOnClose.value) {
      formApi.resetForm();
      selectedIds.value = [];
    }
    skipResetOnClose.value = false;
  },
});

function optionalDate(value: unknown): string {
  if (value === null || value === undefined || value === '') {
    return '';
  }
  return String(value).trim();
}

async function handlePreview() {
  if (selectedIds.value.length === 0) {
    return;
  }
  const { valid } = await formApi.validate();
  if (!valid) {
    return;
  }
  const values = await formApi.getValues();
  const effectiveDate = optionalDate(values.cf_road_eff);
  if (!effectiveDate) {
    message.warning($t('page.costLibrary.hint.renewEffRequired'));
    return;
  }
  const validDate = optionalDate(values.validDate);
  if (validDate && validDate < effectiveDate) {
    message.warning($t('page.costLibrary.hint.renewValidBeforeEff'));
    return;
  }

  submitting.value = true;
  modalApi.lock();
  try {
    const [suppliers, ...sources] = await Promise.all([
      getSupplierList({
        category: 'TRUCK',
        page: 1,
        pageSize: 500,
        status: 1,
      }),
      ...selectedIds.value.map((id) => getRoadCost(id)),
    ]);
    const lookup = toSupplierFormulaLookup(suppliers.items);
    const { items, renewJobs } = buildRoadRenewPreviewPlan(
      sources,
      values,
      lookup,
    );
    if (items.length === 0) {
      message.warning($t('page.costLibrary.hint.batchRenewSuccess', [0]));
      return;
    }
    skipResetOnClose.value = true;
    modalApi.close();
    previewModalRef.value?.open({
      items,
      operation: 'renew',
      renewJobs,
    });
  } catch {
    message.error($t('page.ai.requestFailed'));
  } finally {
    submitting.value = false;
    modalApi.unlock();
  }
}

function onPreviewSuccess() {
  previewModalRef.value?.close();
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
  <Modal :title="$t('page.costLibrary.actions.batchRenewRoad')">
    <p class="mb-1 text-sm font-medium text-foreground">
      {{ $t('page.costLibrary.hint.batchSelected', [selectedIds.length]) }}
    </p>
    <p class="mb-4 text-sm text-muted-foreground">
      {{ $t('page.costLibrary.hint.batchRenewDesc') }}
    </p>
    <Form class="cost-drawer-form px-1" />
    <template #footer>
      <Button @click="modalApi.close()">{{ $t('common.cancel') }}</Button>
      <Button :loading="submitting" type="primary" @click="handlePreview">
        {{ $t('page.costLibrary.actions.batchPreviewNext') }}
      </Button>
    </template>
  </Modal>
  <BatchCopyPreviewModal
    ref="previewModalRef"
    mode="road"
    :template="template"
    @back="onPreviewBack"
    @success="onPreviewSuccess"
  />
</template>
