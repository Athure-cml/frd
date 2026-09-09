<script lang="ts" setup>
import type { TableColumnsType } from 'ant-design-vue';

import type {
  CostMode,
  CostTableTemplate,
  FreightCostRecord,
  RoadCostRecord,
} from '#/api/cost';

import { computed, h, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import { Button, message, Pagination, Table, Tag } from 'ant-design-vue';

import { batchCopyRoadCost, seaCostApi } from '#/api/cost';
import { $t } from '#/locales';

import { buildPreviewAntColumns } from '../shared/build-columns';
import { formatStatus } from '../shared/formatters';
import { costStatusTagOptions } from '../shared/tags';

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
const pendingRequest = ref<null | Record<string, unknown>>(null);
const confirming = ref(false);
const previewPage = ref({ current: 1, pageSize: 20 });

const isSea = computed(() => props.mode === 'sea');

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

const [Modal, modalApi] = useVbenModal({
  class: 'w-full sm:w-[min(96vw,1280px)]',
  footer: false,
  onOpenChange(isOpen) {
    if (!isOpen) {
      previewItems.value = [];
      pendingRequest.value = null;
      previewPage.value.current = 1;
    }
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
  request: Record<string, unknown>;
}) {
  previewItems.value = options.items;
  pendingRequest.value = options.request;
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
  if (!pendingRequest.value) {
    return;
  }
  confirming.value = true;
  modalApi.lock();
  try {
    const payload = { ...pendingRequest.value, previewOnly: false };
    const result = isSea.value
      ? await seaCostApi.batchCopy(payload as any)
      : await batchCopyRoadCost(payload as any);
    message.success(
      $t('page.costLibrary.hint.batchCopySuccess', [result.created]),
    );
    emit('success');
    close();
  } finally {
    confirming.value = false;
    modalApi.unlock();
  }
}

defineExpose({ close, open });
</script>

<template>
  <Modal :title="$t('page.costLibrary.actions.batchCopyPreview')">
    <p class="mb-4 text-sm text-muted-foreground">
      {{
        $t('page.costLibrary.hint.batchCopyPreviewHint', [previewItems.length])
      }}
    </p>
    <Table
      :columns="columns"
      :data-source="pagedItems"
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
      <Button :loading="confirming" type="primary" @click="confirmCopy">
        {{ $t('page.costLibrary.actions.batchCopyConfirm') }}
      </Button>
    </div>
  </Modal>
</template>
