<script lang="ts" setup>
import type { TableColumnsType } from 'ant-design-vue';

import type { RoadRenewPreviewJob } from '../road/road-batch-renew';
import type { SeaRenewPreviewJob } from '../sea/sea-batch-renew';

import type {
  CostMode,
  CostTableTemplate,
  FreightCostRecord,
  FreightCostSave,
  RoadCostRecord,
  RoadCostSave,
} from '#/api/cost';

import { computed, h, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import { Button, message, Pagination, Table, Tag } from 'ant-design-vue';

import {
  batchCopyRoadCost,
  renewRoadCost,
  renewSeaCost,
  seaCostApi,
} from '#/api/cost';
import { $t } from '#/locales';

import { buildPreviewAntColumns } from '../shared/build-columns';
import { formatStatus } from '../shared/formatters';
import { costStatusTagOptions } from '../shared/tags';

export type BatchPreviewOperation = 'copy' | 'renew';

const props = withDefaults(
  defineProps<{
    mode?: Extract<CostMode, 'road' | 'sea'>;
    template?: CostTableTemplate;
  }>(),
  { mode: 'road', template: undefined },
);

const emit = defineEmits<{ back: []; success: [] }>();

type PreviewItem = FreightCostRecord | RoadCostRecord;

const previewItems = ref<PreviewItem[]>([]);
const previewTotal = ref(0);
const operation = ref<BatchPreviewOperation>('copy');
const pendingCopyRequest = ref<null | Record<string, unknown>>(null);
const pendingRenewJobs = ref<Array<RoadRenewPreviewJob | SeaRenewPreviewJob>>(
  [],
);
const confirming = ref(false);
const previewPage = ref({ current: 1, pageSize: 20 });

const isSea = computed(() => props.mode === 'sea');

const modalTitle = computed(() =>
  operation.value === 'renew'
    ? $t('page.costLibrary.actions.batchRenewPreview')
    : $t('page.costLibrary.actions.batchCopyPreview'),
);

const previewHint = computed(() => {
  if (operation.value === 'renew') {
    return $t('page.costLibrary.hint.batchRenewPreviewHint', [
      previewItems.value.length,
    ]);
  }
  const total =
    previewTotal.value ||
    (previewItems.value.length > 0 ? previewItems.value.length : 0);
  const shown = previewItems.value.length;
  if (total > shown) {
    return $t('page.costLibrary.hint.batchCopyPreviewPartialHint', [
      total,
      shown,
    ]);
  }
  return $t('page.costLibrary.hint.batchCopyPreviewHint', [total]);
});

const confirmLabel = computed(() =>
  operation.value === 'renew'
    ? $t('page.costLibrary.actions.batchRenewConfirm')
    : $t('page.costLibrary.actions.batchCopyConfirm'),
);

const statusColorMap = computed(() => {
  const map = new Map<string, string>();
  for (const option of costStatusTagOptions()) {
    map.set(String(option.value), String(option.color));
  }
  return map;
});

const columns = computed<TableColumnsType>(() => {
  const base = buildPreviewAntColumns(props.mode, props.template);
  return base.map((column) => {
    if (column.key !== 'status') {
      return column;
    }
    return {
      ...column,
      customRender: ({ record }: { record: PreviewItem }) =>
        renderStatusTag(String(record.status ?? '')),
    };
  });
});

const scrollX = computed(() =>
  columns.value.reduce((sum, column) => sum + Number(column.width ?? 100), 0),
);

const pagedItems = computed(() => {
  const start = (previewPage.value.current - 1) * previewPage.value.pageSize;
  return previewItems.value.slice(start, start + previewPage.value.pageSize);
});

function resetPreviewState() {
  previewItems.value = [];
  previewTotal.value = 0;
  pendingCopyRequest.value = null;
  pendingRenewJobs.value = [];
  operation.value = 'copy';
  previewPage.value.current = 1;
  confirming.value = false;
}

const [Modal, modalApi] = useVbenModal({
  class: 'w-full sm:w-[min(96vw,1280px)]',
  footer: false,
  onClosed() {
    resetPreviewState();
  },
});

function renderStatusTag(status: string) {
  if (!status) {
    return '—';
  }
  return h(Tag, { color: statusColorMap.value.get(status) }, () =>
    formatStatus(status as 'active' | 'expired' | 'pending'),
  );
}

function open(options: {
  items: PreviewItem[];
  operation?: BatchPreviewOperation;
  renewJobs?: Array<RoadRenewPreviewJob | SeaRenewPreviewJob>;
  request?: Record<string, unknown>;
  total?: number;
}) {
  previewItems.value = options.items;
  previewTotal.value = options.total ?? options.items.length;
  operation.value = options.operation ?? 'copy';
  pendingCopyRequest.value = options.request ?? null;
  pendingRenewJobs.value = options.renewJobs ?? [];
  previewPage.value.current = 1;
  modalApi.open();
}

function close() {
  modalApi.close();
}

function onBack() {
  close();
  emit('back');
}

async function confirmCopy() {
  if (!pendingCopyRequest.value || confirming.value) {
    return;
  }
  confirming.value = true;
  try {
    const payload = { ...pendingCopyRequest.value, previewOnly: false };
    const result = isSea.value
      ? await seaCostApi.batchCopy(payload as any)
      : await batchCopyRoadCost(payload as any);
    const copied = result.created || result.total || previewTotal.value;
    if (copied === 0) {
      message.warning($t('page.costLibrary.hint.batchCopySuccess', [0]));
      return;
    }
    message.success($t('page.costLibrary.hint.batchCopySuccess', [copied]));
    close();
    emit('success');
  } catch {
    message.error($t('page.ai.requestFailed'));
  } finally {
    confirming.value = false;
  }
}

async function confirmRenew() {
  if (pendingRenewJobs.value.length === 0 || confirming.value) {
    return;
  }
  confirming.value = true;
  try {
    for (const job of pendingRenewJobs.value) {
      await (isSea.value
        ? renewSeaCost(job.sourceId, job.payload as FreightCostSave)
        : renewRoadCost(job.sourceId, job.payload as RoadCostSave));
    }
    message.success(
      $t('page.costLibrary.hint.batchRenewSuccess', [
        pendingRenewJobs.value.length,
      ]),
    );
    close();
    emit('success');
  } catch {
    message.error($t('page.ai.requestFailed'));
  } finally {
    confirming.value = false;
  }
}

async function handleConfirm() {
  if (operation.value === 'renew') {
    await confirmRenew();
    return;
  }
  await confirmCopy();
}

defineExpose({ close, open });
</script>

<template>
  <Modal :title="modalTitle">
    <p class="mb-4 text-sm text-muted-foreground">
      {{ previewHint }}
    </p>
    <Table
      :columns="columns"
      :data-source="pagedItems"
      :loading="confirming"
      :pagination="false"
      :row-key="(_row, index) => String(index)"
      :scroll="{ x: scrollX, y: 420 }"
      size="small"
    />
    <div
      v-if="previewItems.length > previewPage.pageSize"
      class="mt-3 flex justify-end"
    >
      <Pagination
        v-model:current="previewPage.current"
        :page-size="previewPage.pageSize"
        :show-size-changer="false"
        :total="previewItems.length"
      />
    </div>
    <div class="mt-6 flex flex-wrap justify-end gap-2">
      <Button :disabled="confirming" @click="onBack">
        {{ $t('page.costLibrary.actions.batchCopyBack') }}
      </Button>
      <Button :disabled="confirming" @click="modalApi.close()">
        {{ $t('common.cancel') }}
      </Button>
      <Button :loading="confirming" type="primary" @click="handleConfirm">
        {{ confirmLabel }}
      </Button>
    </div>
  </Modal>
</template>
