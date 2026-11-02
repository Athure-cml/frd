<script lang="ts" setup>
/**
 * 数据来源快照表
 * - 高度：跟内容走
 * - 宽度：按 Tab 容器测宽铺满（接口 width 只当下限）；超出则 vxe 自带横滚
 * - 禁止再死用接口返回 width 当最终宽（会铺不满 Tab）
 */
import type { QuoteApi, QuoteCostType } from '#/api/quote';

import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
} from 'vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { $t } from '#/locales';

import { isFumigationLegacySnapshot } from '../../cost-library/shared/fumigation-template-layouts';
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

const EMPTY_MIN_HEIGHT = 160;

const hostRef = ref<HTMLElement | null>(null);
/** Tab 可视宽度（probe 测量，不被列撑开） */
const hostWidth = ref(0);

let hostWidthObserver: null | ResizeObserver = null;

const mode = computed(() => quoteCostTypeToMode(props.type));

const sourceMatches = computed(() => {
  if (props.matches?.length) {
    return props.matches;
  }
  return props.match ? [props.match] : [];
});

const fumigationLegacy = computed(() => {
  if (props.type !== 'FUMIGATION') {
    return false;
  }
  const first = sourceMatches.value[0]?.snapshot;
  return isFumigationLegacySnapshot(
    first as null | Record<string, unknown> | undefined,
  );
});

/** 必须带 hostWidth：用容器宽铺满，而不是死继承接口列宽 */
const snapshotColumns = computed(() =>
  buildCostSnapshotColumns(mode.value, hostWidth.value, {
    fumigationLegacy: fumigationLegacy.value,
  }),
);

const tableData = computed(() =>
  sourceMatches.value.map((item) =>
    normalizeSnapshotRow(props.type, item.snapshot ?? {}, item.costRefId),
  ),
);

const isEmpty = computed(() => tableData.value.length === 0);

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

function readHostWidth() {
  const el = hostRef.value;
  if (!el) {
    return 0;
  }
  const probe = el.querySelector(
    '.quote-cost-snapshot__probe',
  ) as HTMLElement | null;
  const width = probe?.clientWidth ?? el.clientWidth;
  return Math.max(0, Math.floor(width));
}

function syncHostWidth() {
  const next = readHostWidth();
  if (next > 0 && Math.abs(next - hostWidth.value) >= 1) {
    hostWidth.value = next;
  }
}

const [Grid, gridApi] = useVbenVxeGrid({
  gridClass: gridClass.value,
  gridOptions: {
    border: true,
    columnConfig: {
      resizable: true,
    },
    columns: snapshotColumns.value,
    customConfig: {
      storage: false,
    },
    data: tableData.value,
    emptyText: emptyText.value,
    fit: false,
    id: `quote-cost-snapshot-${props.type}`,
    ...(isEmpty.value ? { minHeight: EMPTY_MIN_HEIGHT } : {}),
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
    scrollbarConfig: {
      x: { visible: 'auto' },
    },
    scrollX: {
      enabled: true,
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

async function reloadGrid() {
  syncHostWidth();
  gridApi.setGridOptions({
    columns: snapshotColumns.value,
    data: tableData.value,
    emptyText: emptyText.value,
    fit: false,
    height: undefined,
    minHeight: isEmpty.value ? EMPTY_MIN_HEIGHT : undefined,
    scrollbarConfig: {
      x: { visible: 'auto' },
    },
    scrollX: { enabled: true },
    scrollY: { enabled: false },
  });
  gridApi.setState({ gridClass: gridClass.value });
  await nextTick();
  const $grid = gridApi.grid as null | {
    loadColumn?: (cols: typeof snapshotColumns.value) => void;
    recalculate?: (refull?: boolean) => void;
  };
  $grid?.loadColumn?.(snapshotColumns.value);
  await nextTick();
  $grid?.recalculate?.(true);
}

watch([mode, tableData, snapshotColumns, emptyText, isEmpty], () => {
  void reloadGrid();
});

onMounted(() => {
  syncHostWidth();
  void reloadGrid();
  const el = hostRef.value;
  if (!el || typeof ResizeObserver === 'undefined') {
    return;
  }
  hostWidthObserver = new ResizeObserver(() => {
    syncHostWidth();
  });
  hostWidthObserver.observe(el);
  const probe = el.querySelector('.quote-cost-snapshot__probe');
  if (probe) {
    hostWidthObserver.observe(probe);
  }
});

onBeforeUnmount(() => {
  hostWidthObserver?.disconnect();
  hostWidthObserver = null;
});
</script>

<template>
  <div ref="hostRef" class="quote-cost-snapshot">
    <!-- 测 Tab 可视宽：不被表格列撑开 -->
    <div class="quote-cost-snapshot__probe" aria-hidden="true"></div>
    <Grid />
  </div>
</template>

<style scoped>
.quote-cost-snapshot {
  position: relative;
  width: 100%;
  min-width: 0;
  max-width: 100%;
  overflow: hidden;
}

.quote-cost-snapshot__probe {
  width: 100%;
  height: 0;
  overflow: hidden;
  pointer-events: none;
}

.quote-cost-snapshot
  :deep(.vxe-grid.cost-library-grid.quote-cost-snapshot-grid) {
  width: 100% !important;
  max-width: 100% !important;
  height: auto !important;
  min-height: unset !important;
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
