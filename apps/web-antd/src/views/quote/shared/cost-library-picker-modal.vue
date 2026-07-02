<script lang="ts" setup>
import type { QuoteCostType } from '#/api/quote';

import { computed, nextTick, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import { message } from 'ant-design-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { getCostApi } from '#/api/cost';
import { $t } from '#/locales';

import { useFumigationSearchSchema } from '../../cost-library/fumigation/data';
import { useRoadSearchSchema } from '../../cost-library/road/data';
import { useSeaSearchSchema } from '../../cost-library/sea/data';
import { useI18nFormOptions } from '../../shared/use-i18n-form-options';
import {
  buildQuoteCostPickerColumns,
  quoteCostTypeToMode,
} from './cost-picker-columns';
import {
  type CostLibraryRecord,
  getInitialSearchValues,
  type QuoteMatchKeys,
} from './sheet-cost-import';

import './quote.css';

const emit = defineEmits<{
  confirm: [type: QuoteCostType, record: CostLibraryRecord];
}>();

const costType = ref<QuoteCostType>('ROAD');
const matchKeys = ref<QuoteMatchKeys>({});
const selectedRow = ref<CostLibraryRecord | null>(null);

const modalTitle = computed(() => {
  const titleMap: Record<QuoteCostType, string> = {
    ROAD: $t('page.quote.actions.importCostRoad'),
    SEA: $t('page.quote.actions.importCostSea'),
    FUMIGATION: $t('page.quote.actions.importCostFumigation'),
  };
  return titleMap[costType.value];
});

function resolveSearchSchema() {
  const mode = quoteCostTypeToMode(costType.value);
  if (mode === 'road') {
    return useRoadSearchSchema();
  }
  if (mode === 'fumigation') {
    return useFumigationSearchSchema();
  }
  return useSeaSearchSchema();
}

const searchFormOptions = useI18nFormOptions(() => ({
  collapsed: false,
  schema: resolveSearchSchema(),
  showCollapseButton: true,
  submitOnChange: false,
}));

const [Modal, modalApi] = useVbenModal({
  class: 'w-[96vw] max-w-[1600px]',
  contentClass: '!flex !min-h-0 !flex-col !overflow-hidden !p-0',
  destroyOnClose: true,
  onConfirm: onConfirmPick,
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
});

const [Grid, gridApi] = useVbenVxeGrid({
  class: 'min-h-0 flex-1',
  formOptions: searchFormOptions.value,
  gridClass: 'quote-cost-picker-grid',
  gridEvents: {
    radioChange: ({ row }: { row: CostLibraryRecord }) => {
      selectedRow.value = row;
    },
  },
  gridOptions: {
    columns: buildQuoteCostPickerColumns('road'),
    height: 520,
    minHeight: 400,
    pagerConfig: {},
    proxyConfig: {
      ajax: {
        query: async ({ page }, formValues) => {
          const api = getCostApi(quoteCostTypeToMode(costType.value));
          return api.list({
            page: page.currentPage,
            pageSize: page.pageSize,
            ...formValues,
          });
        },
      },
    },
    radioConfig: {
      highlight: true,
      trigger: 'row',
    },
    rowConfig: {
      keyField: 'id',
    },
    scrollX: {
      enabled: true,
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

function clearSelection() {
  selectedRow.value = null;
  gridApi.grid?.clearRadioRow?.();
}

function onConfirmPick() {
  const row = selectedRow.value ?? gridApi.grid?.getRadioRecord?.();
  if (!row) {
    message.warning($t('page.quote.costPicker.selectOne'));
    return;
  }
  emit('confirm', costType.value, row as CostLibraryRecord);
  modalApi.close();
}

async function open(type: QuoteCostType, keys: QuoteMatchKeys) {
  costType.value = type;
  matchKeys.value = keys;
  selectedRow.value = null;
  modalApi.open();
  await nextTick();
  gridApi.setGridOptions({
    columns: buildQuoteCostPickerColumns(quoteCostTypeToMode(type)),
  });
  await gridApi.formApi?.resetForm?.();
  await gridApi.formApi?.setValues?.(getInitialSearchValues(type, keys));
  await gridApi.query?.();
}

defineExpose({ open });
</script>

<template>
  <Modal :title="modalTitle">
    <div class="quote-cost-picker">
      <div class="quote-cost-picker__grid">
        <Grid :form-options="searchFormOptions" />
      </div>
    </div>
  </Modal>
</template>
