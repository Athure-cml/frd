<script lang="ts" setup>
import type { CostLibraryRecord, QuoteMatchKeys } from './sheet-cost-import';

import type { VbenFormSchema } from '#/adapter/form';
import type { CostMode, CostTableTemplate } from '#/api/cost';
import type { QuoteCostType } from '#/api/quote';

import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import { message } from 'ant-design-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { listCostTableTemplates } from '#/api/cost/templates';
import { getQuoteLibraryListApi } from '#/api/quote/library';
import { $t } from '#/locales';

import { normalizeRoadCitySearchParam } from '../../cost-library/road/data';
import { createTemplateColumnBgStyleHandlers } from '../../cost-library/shared/column-bg-style';
import { adaptCostColumnsForViewport } from '../../cost-library/shared/columns';
import { withCostSearchFormLayout } from '../../cost-library/shared/cost-search-form-layout';
import { getCostGridClass } from '../../cost-library/shared/cost-search-schema';
import { createHighlightOnlySearchField } from '../../cost-library/shared/highlight-only-search';
import {
  FUMIGATION_MULTI_SEARCH_FIELDS,
  normalizePipeSearchParams,
  normalizeSeaMultiSearchParams,
  ROAD_MULTI_SEARCH_FIELDS,
} from '../../cost-library/shared/multi-search-params';
import { createCostRowHighlightStyleHandlers } from '../../cost-library/shared/row-highlight-style';
import { normalizeQuoteLibraryStatusSearchParams } from '../../cost-library/shared/status-search';
import { resolveActiveTemplate } from '../../cost-library/shared/use-table-templates';
import { useI18nFormOptions } from '../../shared/use-i18n-form-options';
import {
  useQuoteLibraryFumigationSearchSchema,
  useQuoteLibraryRoadSearchSchema,
  useQuoteLibrarySeaSearchSchema,
} from '../library/shared/quote-library-search';
import {
  buildQuoteCostPickerColumns,
  quoteCostTypeToMode,
} from './cost-picker-columns';
import {
  getInitialSearchValues,
  getQuoteLibraryImportBlockReason,
  isActiveCostRecord,
} from './sheet-cost-import';
import { MAX_OCEAN_FREIGHT_LINES } from './sheet-ocean-freight';
import { MAX_ROAD_MATCHES } from './sheet-road-freight';

import '../../cost-library/shared/cost-library.css';
import './quote.css';

const emit = defineEmits<{
  confirm: [type: QuoteCostType, records: CostLibraryRecord[]];
}>();

const costType = ref<QuoteCostType>('ROAD');
const matchKeys = ref<QuoteMatchKeys>({});
const selectedRow = ref<CostLibraryRecord | null>(null);
const preselectedIds = ref<number[]>([]);
const selectedCount = ref(0);
const searchFormCollapsed = ref(true);
/** 与报价库列表一致：仅用报价库当前应用模板，不用内置默认（避免弹窗闪两套表头） */
const activeTemplate = ref<CostTableTemplate | null>(null);
const pendingOpen = ref<null | {
  keys: QuoteMatchKeys;
  selectedIds?: number[];
  type: QuoteCostType;
}>(null);

const pickerMode = computed(() => quoteCostTypeToMode(costType.value));
const isMultiSelect = computed(
  () => costType.value === 'SEA' || costType.value === 'ROAD',
);
const multiSelectMax = computed(() =>
  costType.value === 'ROAD' ? MAX_ROAD_MATCHES : MAX_OCEAN_FREIGHT_LINES,
);

const modalTitle = computed(() => {
  const titleMap: Record<QuoteCostType, string> = {
    ROAD: $t('page.quote.actions.importCostRoad'),
    SEA: $t('page.quote.actions.importCostSea'),
    FUMIGATION: $t('page.quote.actions.importCostFumigation'),
  };
  return titleMap[costType.value];
});

const footerHint = computed(() =>
  isMultiSelect.value
    ? $t('page.quote.costPicker.confirmHintSea', [multiSelectMax.value])
    : $t('page.quote.costPicker.confirmHint'),
);

function canImportRow(row: CostLibraryRecord) {
  return isActiveCostRecord(
    costType.value,
    row as unknown as Record<string, unknown>,
  );
}

function importBlockMessage(row: CostLibraryRecord) {
  const reason = getQuoteLibraryImportBlockReason(
    costType.value,
    row as unknown as Record<string, unknown>,
  );
  if (reason === 'pendingConfirm') {
    return $t('page.quote.message.costPendingConfirm');
  }
  return $t('page.quote.message.costExpired');
}

function getPickerSearchSchema(mode: CostMode): VbenFormSchema[] {
  const highlightField = createHighlightOnlySearchField();
  if (mode === 'road') {
    return [...useQuoteLibraryRoadSearchSchema(), highlightField];
  }
  if (mode === 'fumigation') {
    return [...useQuoteLibraryFumigationSearchSchema(), highlightField];
  }
  return [...useQuoteLibrarySeaSearchSchema(), highlightField];
}

function buildPickerSearchFormOptions(type: QuoteCostType = costType.value) {
  return withCostSearchFormLayout({
    schema: getPickerSearchSchema(quoteCostTypeToMode(type)),
    handleCollapsedChange: (collapsed) => {
      searchFormCollapsed.value = collapsed;
    },
  });
}

const searchFormOptions = useI18nFormOptions(() =>
  buildPickerSearchFormOptions(),
);

const pickerGridClass = computed(
  () => `quote-cost-picker-grid ${getCostGridClass(pickerMode.value)}`,
);

const gridHostRef = ref<HTMLElement | null>(null);
/** 弹窗表格区可视宽：接口列宽只当下限，按此铺满 */
const hostWidth = ref(0);
let hostWidthObserver: null | ResizeObserver = null;

function readHostWidth() {
  const el = gridHostRef.value;
  if (!el) {
    return 0;
  }
  const probe = el.querySelector(
    '.quote-cost-picker__probe',
  ) as HTMLElement | null;
  return Math.max(0, Math.floor(probe?.clientWidth ?? el.clientWidth));
}

function syncHostWidth() {
  const next = readHostWidth();
  if (next > 0 && Math.abs(next - hostWidth.value) >= 1) {
    hostWidth.value = next;
  }
}

async function refreshActiveTemplate(mode: CostMode) {
  try {
    // 直连接口，不用 loadTableTemplates 的内置默认回退（否则会先闪一套默认表头）
    const remote = await listCostTableTemplates(mode, 'quote');
    const scoped = remote?.filter((item) => item.mode === mode) ?? [];
    activeTemplate.value = resolveActiveTemplate(scoped, mode, 'quote') ?? null;
  } catch {
    activeTemplate.value = null;
  }
}

function resolvePickerColumns(type: QuoteCostType = costType.value) {
  const template = activeTemplate.value;
  if (!template) {
    return [];
  }
  const mode = quoteCostTypeToMode(type);
  return adaptCostColumnsForViewport(
    buildQuoteCostPickerColumns(mode, {
      containerWidth: hostWidth.value,
      multiSelect: type === 'SEA' || type === 'ROAD',
      template,
    }),
  );
}

function refreshPickerColumns(type: QuoteCostType = costType.value) {
  syncHostWidth();
  if (!activeTemplate.value || hostWidth.value <= 0) {
    return;
  }
  const columns = resolvePickerColumns(type);
  gridApi.setGridOptions({
    columns,
    fit: false,
  });
  void nextTick(() => {
    const $grid = gridApi.grid as null | {
      loadColumn?: (cols: typeof columns) => void;
      recalculate?: (refull?: boolean) => void;
    };
    $grid?.loadColumn?.(columns);
    $grid?.recalculate?.(true);
  });
}

function getSelectedRows(): CostLibraryRecord[] {
  const grid = gridApi.grid;
  if (!grid) {
    return [];
  }
  if (isMultiSelect.value) {
    const current = (grid.getCheckboxRecords?.() ?? []) as CostLibraryRecord[];
    const reserved = (grid.getCheckboxReserveRecords?.() ??
      []) as CostLibraryRecord[];
    const map = new Map<number, CostLibraryRecord>();
    for (const row of [...current, ...reserved]) {
      if (typeof row.id === 'number') {
        map.set(row.id, row);
      }
    }
    return [...map.values()].slice(0, multiSelectMax.value);
  }
  const record =
    selectedRow.value ??
    grid.getRadioRecord?.() ??
    grid.getRadioRecord?.(true) ??
    grid.getCurrentRecord?.();
  return record ? [record as CostLibraryRecord] : [];
}

function syncSelection() {
  selectedCount.value = getSelectedRows().length;
}

function applySelectMode() {
  if (isMultiSelect.value) {
    const max = multiSelectMax.value;
    gridApi.setGridOptions({
      checkboxConfig: {
        checkMethod: ({ row }: { row: CostLibraryRecord }) => {
          if (!canImportRow(row)) {
            return false;
          }
          const selected = getSelectedRows();
          return (
            selected.some((item) => item.id === row.id) || selected.length < max
          );
        },
        highlight: true,
        reserve: true,
        showReserveStatus: true,
      },
      radioConfig: {
        enabled: false,
      },
    });
    return;
  }
  gridApi.setGridOptions({
    checkboxConfig: {
      enabled: false,
    },
    radioConfig: {
      checkMethod: ({ row }: { row: CostLibraryRecord }) => canImportRow(row),
      highlight: true,
      trigger: 'row',
    },
  });
}

const [Modal, modalApi] = useVbenModal({
  class: 'quote-cost-picker-modal w-[96vw] max-w-[1600px]',
  contentClass: '!flex !min-h-0 !flex-1 !flex-col !overflow-hidden !p-0',
  destroyOnClose: true,
  onConfirm: onConfirmPick,
  onOpenChange(isOpen) {
    if (!isOpen) {
      clearSelection();
      pendingOpen.value = null;
      preselectedIds.value = [];
      selectedCount.value = 0;
      activeTemplate.value = null;
      // gridApi 跨次打开会复用，必须清列，否则会先闪上一套表头
      gridApi.setGridOptions({ columns: [] });
    }
  },
  onOpened() {
    void applyOpenSearch();
  },
});

const [Grid, gridApi] = useVbenVxeGrid({
  class: 'min-h-0 flex-1',
  formOptions: searchFormOptions.value,
  gridClass: pickerGridClass.value,
  gridEvents: {
    cellClick: ({ row }: { row: CostLibraryRecord }) => {
      if (isMultiSelect.value) {
        return;
      }
      if (!canImportRow(row)) {
        selectedRow.value = null;
        message.warning(importBlockMessage(row));
        return;
      }
      selectedRow.value = row;
    },
    cellDblclick: ({ row }: { row: CostLibraryRecord }) => {
      if (isMultiSelect.value) {
        return;
      }
      void confirmPick([row]);
    },
    checkboxAll: syncSelection,
    checkboxChange: syncSelection,
    radioChange: ({ row }: { row: CostLibraryRecord }) => {
      if (!canImportRow(row)) {
        selectedRow.value = null;
        message.warning(importBlockMessage(row));
        return;
      }
      selectedRow.value = row;
    },
  },
  gridOptions: {
    // 等报价库模板加载后再刷列，初始空列避免先闪内置默认表头
    columns: [],
    customConfig: {
      storage: false,
    },
    // 与报价库列表一致：fit:true 会藏掉自定义横条
    fit: false,
    height: '100%',
    id: 'quote-cost-library-picker',
    minHeight: 480,
    pagerConfig: {},
    proxyConfig: {
      ajax: {
        query: async ({ page, sort }, formValues) => {
          const api = getQuoteLibraryListApi(pickerMode.value);
          const params = { ...formValues } as Record<string, unknown>;
          // 默认可搜生效中+未生效（已确认）；待确认/已过期可改筛查看，引入时再拦截
          const statusParts = normalizeQuoteLibraryStatusSearchParams(
            params.status,
          );
          if (statusParts.status) {
            params.status = statusParts.status;
          } else {
            delete params.status;
          }
          if (statusParts.confirmStatus) {
            params.confirmStatus = statusParts.confirmStatus;
          } else {
            delete params.confirmStatus;
          }
          if (pickerMode.value === 'sea') {
            normalizeSeaMultiSearchParams(params);
          }
          if (pickerMode.value === 'road') {
            const normalizedCity = normalizeRoadCitySearchParam(params.city);
            if (normalizedCity) {
              params.city = normalizedCity;
            } else {
              delete params.city;
            }
            normalizePipeSearchParams(params, [
              'supplier',
              ...ROAD_MULTI_SEARCH_FIELDS,
            ]);
          }
          if (pickerMode.value === 'fumigation') {
            normalizePipeSearchParams(params, FUMIGATION_MULTI_SEARCH_FIELDS);
          }
          const result = await api({
            page: page.currentPage,
            pageSize: page.pageSize,
            sortField: sort.field,
            sortOrder: sort.order,
            ...params,
          });
          const items = (result.items ?? []).map((row) => ({
            ...row,
            status:
              row.confirmStatus === 'pendingConfirm'
                ? 'pendingConfirm'
                : row.status,
          }));
          queueMicrotask(() => {
            void applyPreselectedRows();
          });
          return { ...result, items };
        },
      },
      sort: true,
    },
    radioConfig: {
      checkMethod: ({ row }: { row: CostLibraryRecord }) => canImportRow(row),
      highlight: true,
      trigger: 'row',
    },
    rowConfig: {
      isHover: true,
      keyField: 'id',
    },
    scrollbarConfig: {
      x: { visible: 'visible' },
    },
    scrollX: {
      enabled: true,
    },
    scrollY: {
      enabled: true,
      gt: 0,
    },
    sortConfig: {
      remote: true,
      trigger: 'default',
    },
    toolbarConfig: {
      refresh: true,
      search: true,
    },
    ...createTemplateColumnBgStyleHandlers(),
    ...createCostRowHighlightStyleHandlers(),
  },
});

async function applyPreselectedRows() {
  if (!isMultiSelect.value || preselectedIds.value.length === 0) {
    syncSelection();
    return;
  }
  await nextTick();
  const grid = gridApi.grid;
  if (!grid) {
    return;
  }
  const rows = (grid.getData?.() ?? []) as CostLibraryRecord[];
  for (const id of preselectedIds.value.slice(0, multiSelectMax.value)) {
    const row = rows.find((item) => item.id === id);
    if (row) {
      grid.setCheckboxRow?.(row, true);
    }
  }
  syncSelection();
}

async function confirmPick(rows?: CostLibraryRecord[] | null) {
  const picked = rows ?? getSelectedRows();
  if (picked.length === 0) {
    message.warning(
      isMultiSelect.value
        ? $t('page.quote.costPicker.selectRows')
        : $t('page.quote.costPicker.selectOne'),
    );
    return false;
  }
  if (isMultiSelect.value && picked.length > multiSelectMax.value) {
    message.error(
      costType.value === 'ROAD'
        ? $t('page.quote.message.maxRoadFreight', [MAX_ROAD_MATCHES])
        : $t('page.quote.message.maxSeaFreight', [MAX_OCEAN_FREIGHT_LINES]),
    );
    return false;
  }
  for (const row of picked) {
    if (
      !isActiveCostRecord(
        costType.value,
        row as unknown as Record<string, unknown>,
      )
    ) {
      message.error(importBlockMessage(row));
      return false;
    }
  }
  const type = costType.value;
  await modalApi.close();
  await nextTick();
  emit('confirm', type, picked);
  return true;
}

function clearSelection() {
  selectedRow.value = null;
  gridApi.grid?.clearRadioRow?.();
  gridApi.grid?.clearCheckboxRow?.();
  gridApi.grid?.clearCheckboxReserve?.();
}

async function waitForGridReady() {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    if (typeof gridApi.grid?.commitProxy === 'function') {
      return;
    }
    await nextTick();
  }
}

async function applyOpenSearch() {
  const pending = pendingOpen.value;
  if (!pending) {
    return;
  }
  pendingOpen.value = null;

  await waitForGridReady();

  const { keys, selectedIds, type } = pending;
  costType.value = type;
  matchKeys.value = keys;
  preselectedIds.value = selectedIds ?? [];
  const mode = quoteCostTypeToMode(type);

  // 先清空再刷报价库模板列，避免复用上次列/内置默认造成「两套表头」
  gridApi.setGridOptions({ columns: [] });
  if (!activeTemplate.value) {
    await refreshActiveTemplate(mode);
  }
  if (!activeTemplate.value) {
    message.error($t('page.quote.message.loadTemplateFailed'));
    await modalApi.close();
    return;
  }
  await nextTick();
  syncHostWidth();

  searchFormCollapsed.value = true;
  gridApi.setState({
    formOptions: buildPickerSearchFormOptions(type),
    gridClass: `quote-cost-picker-grid ${getCostGridClass(mode)}`,
  });
  refreshPickerColumns(type);
  applySelectMode();

  const initialValues = {
    ...getInitialSearchValues(type, keys),
  };
  await gridApi.formApi?.resetForm?.();
  await gridApi.formApi?.setValues?.(initialValues);
  gridApi.formApi?.setLatestSubmissionValues?.(initialValues);
  clearSelection();
  await gridApi.reload?.();
  await nextTick();
  // 弹窗动画结束后宽度才准，再铺一次
  window.setTimeout(() => {
    syncHostWidth();
    refreshPickerColumns(type);
    gridApi.grid?.recalculate?.(true);
  }, 80);
  await applyPreselectedRows();
}

watch(gridHostRef, (el) => {
  hostWidthObserver?.disconnect();
  hostWidthObserver = null;
  if (!el || typeof ResizeObserver === 'undefined') {
    return;
  }
  hostWidthObserver = new ResizeObserver(() => {
    const prev = hostWidth.value;
    syncHostWidth();
    if (hostWidth.value > 0 && hostWidth.value !== prev) {
      refreshPickerColumns();
    }
  });
  hostWidthObserver.observe(el);
  const probe = el.querySelector('.quote-cost-picker__probe');
  if (probe) {
    hostWidthObserver.observe(probe);
  }
  syncHostWidth();
});

onBeforeUnmount(() => {
  hostWidthObserver?.disconnect();
  hostWidthObserver = null;
});

async function onConfirmPick() {
  await confirmPick();
}

async function open(
  type: QuoteCostType,
  keys: QuoteMatchKeys,
  options?: { selectedIds?: number[] },
) {
  costType.value = type;
  matchKeys.value = keys;
  preselectedIds.value = options?.selectedIds ?? [];
  selectedRow.value = null;
  selectedCount.value = 0;
  // 先拉报价库模板再开弹窗，避免先渲染空/错表头再切换
  activeTemplate.value = null;
  await refreshActiveTemplate(quoteCostTypeToMode(type));
  if (!activeTemplate.value) {
    message.error($t('page.quote.message.loadTemplateFailed'));
    return;
  }
  pendingOpen.value = { keys, selectedIds: options?.selectedIds, type };
  modalApi.open();
}

defineExpose({ open });
</script>

<template>
  <Modal :title="modalTitle">
    <div class="quote-cost-picker">
      <div
        ref="gridHostRef"
        class="quote-cost-picker__grid"
        :class="{ 'quote-cost-search--collapsed': searchFormCollapsed }"
      >
        <!-- 测弹窗可视宽：不被表格列撑开 -->
        <div class="quote-cost-picker__probe" aria-hidden="true"></div>
        <Grid :form-options="searchFormOptions" />
      </div>
    </div>
    <template #prepend-footer>
      <span class="quote-cost-picker__footer-hint">
        {{ footerHint }}
        <template v-if="isMultiSelect && selectedCount > 0">
          · {{ $t('page.quote.costPicker.selectedCount', [selectedCount]) }}
        </template>
      </span>
    </template>
  </Modal>
</template>
