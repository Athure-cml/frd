<script lang="ts" setup>
import type { LineDraft } from '../shared/cost-mapping';

import type {
  FreightCostRecord,
  FumigationCostRecord,
  RoadCostRecord,
} from '#/api/cost';
import type { QuoteTransportMode } from '#/api/quote';

import { computed, nextTick, ref } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';

import { Button, message } from 'ant-design-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { getCostApi } from '#/api/cost';
import { $t } from '#/locales';

import { useI18nFormOptions } from '../../shared/use-i18n-form-options';
import {
  DEFAULT_ROAD_PRICE_FIELD,
  freightToLineDraft,
  fumigationToLineDraft,
  roadToLineDraft,
  transportToCostMode,
} from '../shared/cost-mapping';
import {
  costModeToPickerMode,
  getCostPickerColumns,
  getCostPickerSearchSchema,
} from './cost-picker-data';
import RoadPriceModal from './road-price-modal.vue';

import '../shared/quote.css';

const props = defineProps<{
  transportMode: QuoteTransportMode;
  /** 当前报价单已引用的成本记录 ID，用于禁止重复选择 */
  usedCostRefIds?: number[];
}>();

const emit = defineEmits<{
  confirm: [lines: LineDraft[]];
}>();

const pickerMode = computed(() => costModeToPickerMode(props.transportMode));
const costApi = computed(() => getCostApi(pickerMode.value));
const usedCostRefIdSet = computed(() => new Set(props.usedCostRefIds ?? []));
const selectedCount = ref(0);
const pendingRoadRecords = ref<RoadCostRecord[]>([]);
const roadPriceOpen = ref(false);

const [Drawer, drawerApi] = useVbenDrawer({
  class: 'w-full sm:w-[960px]',
  contentClass: '!flex !min-h-0 !flex-col !overflow-hidden !p-0',
  destroyOnClose: true,
  onOpenChange(isOpen) {
    if (!isOpen) {
      clearSelection();
    }
  },
  onOpened() {
    void nextTick(() => {
      gridApi.grid?.recalculate?.();
    });
  },
  title: $t('page.quote.costPicker.title'),
});

const searchFormOptions = useI18nFormOptions(() => ({
  collapsed: false,
  schema: getCostPickerSearchSchema(pickerMode.value),
  showCollapseButton: true,
  submitOnChange: false,
}));

const [Grid, gridApi] = useVbenVxeGrid({
  class: 'min-h-0 flex-1',
  formOptions: searchFormOptions.value,
  gridEvents: {
    checkboxAll: syncSelection,
    checkboxChange: syncSelection,
  },
  gridClass: 'quote-cost-picker-grid',
  gridOptions: {
    checkboxConfig: {
      highlight: true,
      reserve: true,
    },
    columns: getCostPickerColumns(pickerMode.value),
    height: '100%',
    minHeight: 0,
    pagerConfig: {},
    proxyConfig: {
      ajax: {
        query: async ({ page }, formValues) => {
          const result = await costApi.value.list({
            page: page.currentPage,
            pageSize: page.pageSize,
            ...formValues,
          });
          queueMicrotask(syncSelection);
          return result;
        },
      },
    },
    rowConfig: {
      keyField: 'id',
    },
    scrollY: {
      enabled: true,
      gt: 0,
    },
    toolbarConfig: {
      refresh: true,
      search: true,
    },
  },
});

function isCostRefUsed(id: number) {
  return usedCostRefIdSet.value.has(id);
}

function applyPickerRestrictions() {
  gridApi.setGridOptions({
    checkboxConfig: {
      checkMethod: ({ row }: { row: { id: number } }) => !isCostRefUsed(row.id),
      highlight: true,
      reserve: true,
    },
    rowClassName: ({ row }: { row: { id: number } }) =>
      isCostRefUsed(row.id) ? 'quote-cost-picker-row--used' : '',
  });
}

function getSelectedRows<T>() {
  return (gridApi.grid?.getCheckboxRecords?.() ?? []) as T[];
}

function syncSelection() {
  selectedCount.value = getSelectedRows().length;
}

function clearSelection() {
  gridApi.grid?.clearCheckboxRow?.();
  syncSelection();
}

function mapFreightRows(records: FreightCostRecord[]) {
  const costMode = transportToCostMode(props.transportMode) as
    | 'RAIL_REF'
    | 'SEA_REF';
  const baseSort = 0;
  return records.map((record, index) =>
    freightToLineDraft(record, costMode, baseSort + index),
  );
}

function mapRoadRows(
  records: RoadCostRecord[],
  priceField = DEFAULT_ROAD_PRICE_FIELD,
) {
  const baseSort = 0;
  return records.map((record, index) =>
    roadToLineDraft(record, priceField, baseSort + index),
  );
}

function finishPick(lines: LineDraft[]) {
  emit('confirm', lines);
  drawerApi.close();
  clearSelection();
}

function onConfirmPick() {
  const selected = getSelectedRows<FreightCostRecord | RoadCostRecord>();
  const rows = selected.filter((row) => !isCostRefUsed(row.id));
  if (rows.length === 0) {
    message.warning(
      selected.length > 0
        ? $t('page.quote.costPicker.allAlreadyAdded')
        : $t('page.quote.costPicker.selectRows'),
    );
    return;
  }
  if (props.transportMode === 'ROAD') {
    pendingRoadRecords.value = rows as RoadCostRecord[];
    roadPriceOpen.value = true;
    return;
  }
  if (props.transportMode === 'RAIL') {
    const fumigationRows = rows as unknown as FumigationCostRecord[];
    finishPick(
      fumigationRows.map((record, index) =>
        fumigationToLineDraft(record, index),
      ),
    );
    return;
  }
  finishPick(mapFreightRows(rows as FreightCostRecord[]));
}

function onRoadPriceConfirm(priceField: typeof DEFAULT_ROAD_PRICE_FIELD) {
  finishPick(mapRoadRows(pendingRoadRecords.value, priceField));
  pendingRoadRecords.value = [];
}

function open() {
  applyPickerRestrictions();
  drawerApi.open();
  void nextTick(() => {
    gridApi.query();
  });
}

defineExpose({
  open,
  close: () => drawerApi.close(),
});
</script>

<template>
  <Drawer>
    <div class="quote-cost-picker">
      <div class="quote-cost-picker__grid">
        <Grid :form-options="searchFormOptions" />
      </div>
    </div>
    <template #footer>
      <div class="quote-cost-picker__footer">
        <span class="quote-cost-picker__footer-hint">
          {{
            selectedCount > 0
              ? $t('page.quote.costPicker.selectedHint', [selectedCount])
              : ''
          }}
        </span>
        <div class="quote-cost-picker__footer-actions">
          <Button @click="drawerApi.close()">
            {{ $t('common.cancel') }}
          </Button>
          <Button
            :disabled="selectedCount === 0"
            type="primary"
            @click="onConfirmPick"
          >
            {{ $t('page.quote.costPicker.addSelected', [selectedCount || 0]) }}
          </Button>
        </div>
      </div>
    </template>
    <RoadPriceModal
      v-model:open="roadPriceOpen"
      :records="pendingRoadRecords"
      @confirm="onRoadPriceConfirm"
    />
  </Drawer>
</template>
