<script lang="ts" setup>
import type { CostLibraryRecord, QuoteMatchKeys } from './sheet-cost-import';

import type { VbenFormSchema } from '#/adapter/form';
import type { CostMode } from '#/api/cost';
import type { QuoteCostType } from '#/api/quote';

import { computed, nextTick, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import { message } from 'ant-design-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { getQuoteLibraryListApi } from '#/api/quote/library';
import { $t } from '#/locales';

import { normalizeRoadCitySearchParam } from '../../cost-library/road/data';
import { createTemplateColumnBgStyleHandlers } from '../../cost-library/shared/column-bg-style';
import { adaptCostColumnsForViewport } from '../../cost-library/shared/columns';
import { withCostSearchFormLayout } from '../../cost-library/shared/cost-search-form-layout';
import { getCostGridClass } from '../../cost-library/shared/cost-search-schema';
import { createHighlightOnlySearchField } from '../../cost-library/shared/highlight-only-search';
import { createCostRowHighlightStyleHandlers } from '../../cost-library/shared/row-highlight-style';
import { normalizeQuoteLibraryStatusSearchParams } from '../../cost-library/shared/status-search';
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

function resolvePickerColumns(type: QuoteCostType = costType.value) {
  return adaptCostColumnsForViewport(
    buildQuoteCostPickerColumns(quoteCostTypeToMode(type), {
      multiSelect: type === 'SEA' || type === 'ROAD',
    }),
  );
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
    columns: resolvePickerColumns(),
    height: '100%',
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
          if (pickerMode.value === 'road') {
            const normalizedCity = normalizeRoadCitySearchParam(params.city);
            if (normalizedCity) {
              params.city = normalizedCity;
            } else {
              delete params.city;
            }
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

  await nextTick();

  searchFormCollapsed.value = true;
  gridApi.setState({
    formOptions: buildPickerSearchFormOptions(type),
    gridClass: `quote-cost-picker-grid ${getCostGridClass(mode)}`,
  });
  gridApi.setGridOptions({
    columns: resolvePickerColumns(type),
  });
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
  gridApi.grid?.recalculate?.();
  await applyPreselectedRows();
}

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
  pendingOpen.value = { keys, selectedIds: options?.selectedIds, type };
  modalApi.open();
}

defineExpose({ open });
</script>

<template>
  <Modal :title="modalTitle">
    <div class="quote-cost-picker">
      <div
        class="quote-cost-picker__grid"
        :class="{ 'quote-cost-search--collapsed': searchFormCollapsed }"
      >
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
