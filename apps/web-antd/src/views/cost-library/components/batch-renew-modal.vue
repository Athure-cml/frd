<script lang="ts" setup>
import type { CostMode, CostTableTemplate } from '#/api/cost';

import { computed, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import { Button, message } from 'ant-design-vue';

import { useVbenForm } from '#/adapter/form';
import { getRoadCost, seaCostApi } from '#/api/cost';
import { getSupplierList } from '#/api/supplier';
import { $t } from '#/locales';

import { useRoadBatchRenewSchema } from '../road/form-schema';
import {
  buildRoadRenewPreviewPlan,
  toSupplierFormulaLookup,
} from '../road/road-batch-renew';
import { buildSeaRenewPreviewPlan } from '../sea/sea-batch-renew';
import { useSeaBatchRenewSchema } from '../shared/freight-schema';
import BatchCopyPreviewModal from './batch-copy-preview-modal.vue';

const props = withDefaults(
  defineProps<{
    mode?: Extract<CostMode, 'road' | 'sea'>;
    template?: CostTableTemplate;
  }>(),
  { mode: 'road', template: undefined },
);

const emit = defineEmits<{ success: [] }>();

const isSea = computed(() => props.mode === 'sea');

const selectedIds = ref<number[]>([]);
const submitting = ref(false);
const skipResetOnClose = ref(false);
const previewModalRef = ref<InstanceType<typeof BatchCopyPreviewModal>>();

const modalTitle = computed(() =>
  isSea.value
    ? $t('page.costLibrary.actions.batchRenewSea')
    : $t('page.costLibrary.actions.batchRenewRoad'),
);

const [Form, formApi] = useVbenForm({
  layout: 'vertical',
  schema: isSea.value ? useSeaBatchRenewSchema() : useRoadBatchRenewSchema(),
  showDefaultActions: false,
  wrapperClass: 'grid-cols-1 sm:grid-cols-2',
});

const [Modal, modalApi] = useVbenModal({
  class: isSea.value ? 'w-full sm:w-[720px]' : 'w-full sm:w-[860px]',
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

function validateSeaEffDates(values: Record<string, unknown>) {
  const freightEff = optionalDate(values.freightEffDate);
  if (!freightEff) {
    message.warning($t('page.costLibrary.hint.renewSeaFreightEffRequired'));
    return false;
  }
  const pairs: Array<[string, string]> = [
    ['freightValidDate', freightEff],
    ['bucValidDate', optionalDate(values.bucEffDate)],
    ['othersValidDate', optionalDate(values.othersEffDate)],
  ];
  for (const [validKey, eff] of pairs) {
    if (!eff) {
      continue;
    }
    const valid = optionalDate(values[validKey]);
    if (valid && valid < eff) {
      message.warning($t('page.costLibrary.hint.renewValidBeforeEff'));
      return false;
    }
  }
  return true;
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
  if (isSea.value) {
    if (!validateSeaEffDates(values)) {
      return;
    }
  } else {
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
  }

  submitting.value = true;
  modalApi.lock();
  try {
    if (isSea.value) {
      const sources = await Promise.all(
        selectedIds.value.map((id) => seaCostApi.get(id)),
      );
      const { items, renewJobs } = buildSeaRenewPreviewPlan(sources, values);
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
      return;
    }

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
  <Modal :title="modalTitle">
    <p class="mb-1 text-sm font-medium text-foreground">
      {{ $t('page.costLibrary.hint.batchSelected', [selectedIds.length]) }}
    </p>
    <p class="mb-4 text-sm text-muted-foreground">
      {{
        isSea
          ? $t('page.costLibrary.hint.batchRenewSeaDesc')
          : $t('page.costLibrary.hint.batchRenewDesc')
      }}
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
    :mode="mode"
    :template="template"
    @back="onPreviewBack"
    @success="onPreviewSuccess"
  />
</template>
