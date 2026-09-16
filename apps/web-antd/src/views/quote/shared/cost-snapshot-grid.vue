<script lang="ts" setup>
import type { CostMode } from '#/api/cost';
import type { QuoteApi, QuoteCostType } from '#/api/quote';

import { computed, nextTick, watch } from 'vue';

import { Empty } from 'ant-design-vue';

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
/** 卡车快照为单行表头；海运/熏蒸为分组双行表头 */
const SNAPSHOT_HEADER_HEIGHT: Record<CostMode, number> = {
  road: 44,
  sea: 88,
  fumigation: 88,
};
const SNAPSHOT_ROW_HEIGHT = 40;
const SNAPSHOT_SCROLLBAR_HEIGHT = 16;

const mode = computed(() => quoteCostTypeToMode(props.type));

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

const headerHeight = computed(() => SNAPSHOT_HEADER_HEIGHT[mode.value]);

const gridHeight = computed(() => {
  if (isEmpty.value) {
    return headerHeight.value;
  }
  return (
    headerHeight.value +
    tableData.value.length * SNAPSHOT_ROW_HEIGHT +
    SNAPSHOT_SCROLLBAR_HEIGHT +
    2
  );
});

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
    columns: buildCostSnapshotColumns(mode.value),
    data: tableData.value,
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
    showOverflow: true,
    stripe: true,
    toolbarConfig: {
      enabled: false,
    },
  },
});

watch(
  [mode, tableData, gridHeight],
  async () => {
    const columns = buildCostSnapshotColumns(mode.value);
    gridApi.setGridOptions({
      columns,
      data: tableData.value,
      height: gridHeight.value,
    });
    gridApi.setState({ gridClass: gridClass.value });
    await nextTick();
    gridApi.grid?.recalculate?.();
    const $grid = gridApi.grid as {
      loadColumn?: (cols: typeof columns) => void;
    };
    $grid?.loadColumn?.(columns);
  },
  { deep: true },
);
</script>

<template>
  <div class="quote-cost-snapshot-scroll">
    <div class="quote-cost-snapshot-stack">
      <div
        class="quote-cost-snapshot"
        :class="{ 'quote-cost-snapshot--header-only': isEmpty }"
        :style="{ height: `${gridHeight}px` }"
      >
        <Grid />
      </div>
      <div v-if="isEmpty" class="quote-cost-snapshot__empty-body">
        <Empty :description="emptyText" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.quote-cost-snapshot-scroll {
  width: 100%;
  overflow: auto hidden;
}

.quote-cost-snapshot-stack {
  width: max-content;
  min-width: 100%;
}

.quote-cost-snapshot {
  flex: none;
  width: 100%;
}

.quote-cost-snapshot
  :deep(.vxe-grid.cost-library-grid.quote-cost-snapshot-grid) {
  height: 100% !important;
  min-height: 0 !important;
}

.quote-cost-snapshot--header-only :deep(.vxe-table--body-wrapper),
.quote-cost-snapshot--header-only :deep(.vxe-table--empty-block) {
  display: none !important;
}

.quote-cost-snapshot__empty-body {
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-width: 100%;
  min-height: 128px;
  padding: 24px 16px;
  background: hsl(var(--card));
  border: 1px solid hsl(var(--border));
  border-top: none;
}

.quote-cost-snapshot__empty-body :deep(.ant-empty-image) {
  height: 56px;
  margin-bottom: 8px;
}

.quote-cost-snapshot__empty-body :deep(.ant-empty-description) {
  font-size: 13px;
  color: hsl(var(--muted-foreground));
}
</style>
