<script lang="ts" setup>
import type { QuoteApi, QuoteCostType } from '#/api/quote';

import { computed, nextTick, watch } from 'vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';

import {
  buildCostSnapshotColumns,
  quoteCostTypeToMode,
} from './cost-picker-columns';
import { normalizeSnapshotRow } from './sheet-cost-import';

import '../../cost-library/shared/cost-library.css';

const props = defineProps<{
  match: QuoteApi.QuoteCostMatchItem;
  type: QuoteCostType;
}>();

const mode = computed(() => quoteCostTypeToMode(props.type));

const tableData = computed(() => [
  normalizeSnapshotRow(
    props.type,
    props.match.snapshot ?? {},
    props.match.costRefId,
  ),
]);

const gridClass = computed(() =>
  mode.value === 'fumigation'
    ? 'cost-library-grid fumigation-cost-grid quote-cost-snapshot-grid'
    : mode.value === 'road'
      ? 'cost-library-grid road-cost-grid quote-cost-snapshot-grid'
      : 'cost-library-grid quote-cost-snapshot-grid',
);

const [Grid, gridApi] = useVbenVxeGrid({
  gridClass: gridClass.value,
  gridOptions: {
    border: true,
    columnConfig: {
      resizable: true,
    },
    columns: buildCostSnapshotColumns(mode.value),
    data: tableData.value,
    height: 'auto',
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
    },
    showOverflow: true,
    stripe: true,
    toolbarConfig: {
      enabled: false,
    },
  },
});

watch(
  [mode, tableData],
  async () => {
    const columns = buildCostSnapshotColumns(mode.value);
    gridApi.setGridOptions({
      columns,
      data: tableData.value,
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
  <Grid />
</template>

<style scoped>
/* 覆盖成本库列表 min-height:360px，快照仅 1 行时按内容撑开 */
:deep(.vxe-grid.cost-library-grid.quote-cost-snapshot-grid) {
  height: auto !important;
  min-height: 0 !important;
}

:deep(.quote-cost-snapshot-grid .vxe-table--body-wrapper) {
  min-height: 0 !important;
}
</style>
