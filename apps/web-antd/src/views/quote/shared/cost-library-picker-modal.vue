<script lang="ts" setup>
import type { CostLibraryRecord, QuoteMatchKeys } from './sheet-cost-import';

import type { QuoteCostType } from '#/api/quote';

import { computed, nextTick, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import { message } from 'ant-design-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { getCostApi } from '#/api/cost';
import { $t } from '#/locales';

import { normalizeRoadCitySearchParam } from '../../cost-library/road/data';
import { createTemplateColumnBgStyleHandlers } from '../../cost-library/shared/column-bg-style';
import { adaptCostColumnsForViewport } from '../../cost-library/shared/columns';
import { withCostSearchFormLayout } from '../../cost-library/shared/cost-search-form-layout';
import {
  getCostGridClass,
  getCostSearchSchema,
} from '../../cost-library/shared/cost-search-schema';
import { createCostRowHighlightStyleHandlers } from '../../cost-library/shared/row-highlight-style';
import { useI18nFormOptions } from '../../shared/use-i18n-form-options';
import {
  buildQuoteCostPickerColumns,
  quoteCostTypeToMode,
} from './cost-picker-columns';
import {
  getInitialSearchValues,
  isActiveCostRecord,
} from './sheet-cost-import';
import { MAX_OCEAN_FREIGHT_LINES } from './sheet-ocean-freight';

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
const isSeaMulti = computed(() => costType.value === 'SEA');

const modalTitle = computed(() => {
  const titleMap: Record<QuoteCostType, string> = {
    ROAD: $t('page.quote.actions.importCostRoad'),
    SEA: $t('page.quote.actions.importCostSea'),
    FUMIGATION: $t('page.quote.actions.importCostFumigation'),
  };
  return titleMap[costType.value];
});

const footerHint = computed(() =>
  isSeaMulti.value
    ? $t('page.quote.costPicker.confirmHintSea', [MAX_OCEAN_FREIGHT_LINES])
    : $t('page.quote.costPicker.confirmHint'),
);

function buildPickerSearchFormOptions(type: QuoteCostType = costType.value) {
  return withCostSearchFormLayout({
    schema: getCostSearchSchema(quoteCostTypeToMode(type)),
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
      multiSelect: type === 'SEA',
    }),
  );
}

function getSelectedRows(): CostLibraryRecord[] {
  const grid = gridApi.grid;
  if (!grid) {
    return [];
  }
  if (isSeaMulti.value) {
    const current = (grid.getCheckboxRecords?.() ?? []) as CostLibraryRecord[];
    const reserved = (grid.getCheckboxReserveRecords?.() ??
      []) as CostLibraryRecord[];
    const map = new Map<number, CostLibraryRecord>();
    for (const row of [...current, ...reserved]) {
      if (typeof row.id === 'number') {
        map.set(row.id, row);
      }
    }
    return [...map.values()].slice(0, MAX_OCEAN_FREIGHT_LINES);
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
  if (isSeaMulti.value) {
    gridApi.setGridOptions({
      checkboxConfig: {
        checkMethod: ({ row }: { row: CostLibraryRecord }) => {
          const selected = getSelectedRows();
          return (
            selected.some((item) => item.id === row.id) ||
            selected.length < MAX_OCEAN_FREIGHT_LINES
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
      if (!isSeaMulti.value) {
        selectedRow.value = row;
      }
    },
    cellDblclick: ({ row }: { row: CostLibraryRecord }) => {
      if (isSeaMulti.value) {
        return;
      }
      void confirmPick([row]);
    },
    checkboxAll: syncSelection,
    checkboxChange: syncSelection,
    radioChange: ({ row }: { row: CostLibraryRecord }) => {
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
          const api = getCostApi(pickerMode.value);
          const params = { ...formValues } as Record<string, unknown>;
          if (pickerMode.value === 'road') {
            const normalizedCity = normalizeRoadCitySearchParam(params.city);
            if (normalizedCity) {
              params.city = normalizedCity;
            } else {
              delete params.city;
            }
          }
          const result = await api.list({
            page: page.currentPage,
            pageSize: page.pageSize,
            sortField: sort.field,
            sortOrder: sort.order,
            ...params,
          });
          queueMicrotask(() => {
            void applyPreselectedRows();
          });
          return result;
        },
      },
      sort: true,
    },
    radioConfig: {
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
  if (!isSeaMulti.value || preselectedIds.value.length === 0) {
    syncSelection();
    return;
  }
  await nextTick();
  const grid = gridApi.grid;
  if (!grid) {
    return;
  }
  const rows = (grid.getData?.() ?? []) as CostLibraryRecord[];
  for (const id of preselectedIds.value.slice(0, MAX_OCEAN_FREIGHT_LINES)) {
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
      isSeaMulti.value
        ? $t('page.quote.costPicker.selectSea')
        : $t('page.quote.costPicker.selectOne'),
    );
    return false;
  }
  if (isSeaMulti.value && picked.length > MAX_OCEAN_FREIGHT_LINES) {
    message.error(
      $t('page.quote.message.maxSeaFreight', [MAX_OCEAN_FREIGHT_LINES]),
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
      message.error($t('page.quote.message.costExpired'));
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
    status: 'active',
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
        <template v-if="isSeaMulti && selectedCount > 0">
          · {{ $t('page.quote.costPicker.selectedCount', [selectedCount]) }}
        </template>
      </span>
    </template>
  </Modal>
</template>
