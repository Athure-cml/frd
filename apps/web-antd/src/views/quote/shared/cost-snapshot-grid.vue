<script lang="ts" setup>
import type { VxeTableGridOptions } from '#/adapter/vxe-table';
import type { QuoteApi, QuoteCostType } from '#/api/quote';

import { computed, nextTick, watch } from 'vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { $t } from '#/locales';

import {
  buildCostSnapshotColumns,
  quoteCostTypeToMode,
} from './cost-picker-columns';
import { normalizeSnapshotRow } from './sheet-cost-import';

import '../../cost-library/shared/cost-library.css';

const props = defineProps<{
  emptyDescription?: string;
  match?: QuoteApi.QuoteCostMatchItem;
  matches?: QuoteApi.QuoteCostMatchItem[];
  type: QuoteCostType;
}>();

const SNAPSHOT_HEADER_ROW_HEIGHT = 44;
const SNAPSHOT_ROW_HEIGHT = 40;
/** 预留横向滚动条高度，避免被容器裁切 */
const SNAPSHOT_SCROLLBAR_HEIGHT = 14;
/** 无数据时表格主体最小高度（不含滚动条） */
const SNAPSHOT_MIN_BODY_HEIGHT = 120;

function resolveHeaderRowCount(
  columns?: VxeTableGridOptions['columns'],
): number {
  if (!columns?.length) {
    return 1;
  }
  const walk = (
    cols: NonNullable<VxeTableGridOptions['columns']>,
    depth: number,
  ): number => {
    let maxDepth = depth;
    for (const col of cols) {
      const childCols = col.children as
        | NonNullable<VxeTableGridOptions['columns']>
        | undefined;
      if (childCols?.length) {
        maxDepth = Math.max(maxDepth, walk(childCols, depth + 1));
      }
    }
    return maxDepth;
  };
  return walk(columns, 1);
}

const mode = computed(() => quoteCostTypeToMode(props.type));
const snapshotColumns = computed(() => buildCostSnapshotColumns(mode.value));
const headerRowCount = computed(() =>
  resolveHeaderRowCount(snapshotColumns.value),
);

const sourceMatches = computed(() => {
  if (props.matches?.length) {
    return props.matches;
  }
  return props.match ? [props.match] : [];
});

const tableData = computed(() =>
  sourceMatches.value.map((item) =>
    normalizeSnapshotRow(props.type, item.snapshot ?? {}, item.costRefId),
  ),
);

const isEmpty = computed(() => tableData.value.length === 0);

const headerHeight = computed(
  () => headerRowCount.value * SNAPSHOT_HEADER_ROW_HEIGHT,
);

const bodyHeight = computed(() => {
  const rowsHeight = isEmpty.value
    ? SNAPSHOT_MIN_BODY_HEIGHT
    : tableData.value.length * SNAPSHOT_ROW_HEIGHT;
  // 空表也要留出滚动条，否则列溢出时底部条被裁掉
  return rowsHeight + SNAPSHOT_SCROLLBAR_HEIGHT + 2;
});

const gridHeight = computed(() => headerHeight.value + bodyHeight.value);

const gridClass = computed(() => {
  const base = 'cost-library-grid quote-cost-snapshot-grid';
  if (mode.value === 'fumigation') {
    return `${base} fumigation-cost-grid`;
  }
  if (mode.value === 'road') {
    return `${base} road-cost-grid`;
  }
  return `${base} sea-cost-grid`;
});

const emptyText = computed(() => props.emptyDescription ?? $t('common.noData'));

const [Grid, gridApi] = useVbenVxeGrid({
  gridClass: gridClass.value,
  gridOptions: {
    border: true,
    columnConfig: {
      resizable: true,
    },
    columns: snapshotColumns.value,
    data: tableData.value,
    emptyText: emptyText.value,
    height: gridHeight.value,
    pagerConfig: {
      enabled: false,
    },
    proxyConfig: {
      enabled: false,
    },
    rowConfig: {
      isHover: true,
      keyField: 'id',
    },
    scrollX: {
      enabled: true,
      gt: 0,
    },
    scrollY: {
      enabled: false,
    },
    showHeaderOverflow: true,
    showOverflow: true,
    stripe: true,
    toolbarConfig: {
      enabled: false,
    },
  },
});

watch(
  [mode, tableData, gridHeight, snapshotColumns, emptyText],
  async () => {
    gridApi.setGridOptions({
      columns: snapshotColumns.value,
      data: tableData.value,
      emptyText: emptyText.value,
      height: gridHeight.value,
    });
    gridApi.setState({ gridClass: gridClass.value });
    await nextTick();
    gridApi.grid?.recalculate?.();
    const $grid = gridApi.grid as {
      loadColumn?: (cols: typeof snapshotColumns.value) => void;
    };
    $grid?.loadColumn?.(snapshotColumns.value);
  },
  { deep: true },
);
</script>

<template>
  <!-- 容器定宽 + VXE 内部横向滚动，才能让 SUPPLIER 等 fixed 列生效 -->
  <div
    class="quote-cost-snapshot"
    :style="{ height: `${gridHeight}px`, minHeight: `${gridHeight}px` }"
  >
    <Grid />
  </div>
</template>

<style scoped>
.quote-cost-snapshot {
  flex: none;
  width: 100%;
  max-width: 100%;
  overflow: hidden;
}

.quote-cost-snapshot
  :deep(.vxe-grid.cost-library-grid.quote-cost-snapshot-grid) {
  width: 100%;
  height: 100% !important;
  min-height: 100% !important;
}

.quote-cost-snapshot :deep(.vxe-table--header .vxe-header--row) {
  height: 44px;
}

.quote-cost-snapshot :deep(.vxe-table--header .vxe-header--column .vxe-cell) {
  min-height: 44px;
  padding-top: 10px;
  padding-bottom: 10px;
}

.quote-cost-snapshot :deep(.vxe-table--empty-block) {
  min-height: 120px;
}

.quote-cost-snapshot :deep(.vxe-table--empty-placeholder) {
  box-sizing: border-box;
  padding: 24px 16px 30px;
  font-size: 13px;
  color: hsl(var(--muted-foreground));
}

.quote-cost-snapshot :deep(.vxe-table--empty-block img),
.quote-cost-snapshot :deep(.vxe-table--empty-placeholder img) {
  display: none;
}
</style>
