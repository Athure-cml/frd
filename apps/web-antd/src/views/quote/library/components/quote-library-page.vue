<script lang="ts" setup>
import type { QuoteLibraryMode } from '../shared/quote-library-columns';
import type { QuoteLibraryRow } from '../shared/quote-library-row';

import type { VbenFormSchema } from '#/adapter/form';
import type {
  OnActionClickParams,
  VxeTableGridOptions,
} from '#/adapter/vxe-table';
import type { CostMode, CostTableTemplate } from '#/api/cost';

import { computed, onActivated, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';

import { useAccess } from '@vben/access';
import { Page } from '@vben/common-ui';
import { Download } from '@vben/icons';
import { usePreferences } from '@vben/preferences';

import { Button, message, Modal } from 'ant-design-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { downloadCostExport } from '#/api/cost';
import { getQuoteRuleList } from '#/api/quote-rule';
import {
  batchDeleteQuoteLibrary,
  deleteQuoteLibraryRecord,
  exportQuoteLibrary,
  getQuoteLibraryListApi,
} from '#/api/quote/library';
import { $t } from '#/locales';

import { normalizeRoadCitySearchParam } from '../../../cost-library/road/data';
import { createTemplateColumnBgStyleHandlers } from '../../../cost-library/shared/column-bg-style';
import {
  adaptCostColumnsForViewport,
  injectRelationColumn,
} from '../../../cost-library/shared/columns';
import {
  navigateToCostLibrary,
  useRelationFocus,
} from '../../../cost-library/shared/cost-quote-relation';
import { getDefaultTemplate } from '../../../cost-library/shared/default-templates';
import { createCostRowHighlightStyleHandlers } from '../../../cost-library/shared/row-highlight-style';
import {
  loadTableTemplates,
  resolveActiveTemplate,
} from '../../../cost-library/shared/use-table-templates';
import { buildListExportParams } from '../../../shared/export-params';
import { useI18nFormOptions } from '../../../shared/use-i18n-form-options';
import { buildQuoteLibraryRuleHintMap } from '../../shared/quote-rule-hints';
import {
  quoteLibraryGridId,
  useQuoteLibraryColumns,
} from '../shared/quote-library-columns';
import {
  collectQuoteLibraryExportColumns,
  fallbackQuoteLibraryExportColumns,
} from '../shared/quote-library-export-columns';
import QuoteLibraryBatchEditModal from './quote-library-batch-edit-modal.vue';
import QuoteLibraryEditDrawer from './quote-library-edit-drawer.vue';

import '../../../cost-library/shared/cost-library.css';
import '../../shared/quote.css';

const props = defineProps<{
  descriptionKey: string;
  editPermission: string;
  exportFilename: string;
  mode: QuoteLibraryMode;
  searchSchema: () => VbenFormSchema[];
  titleKey: string;
}>();

const router = useRouter();
const { hasAccessByCodes } = useAccess();
const { isMobile } = usePreferences();
const fetchList = getQuoteLibraryListApi(props.mode);

const libraryEditPermission = computed(
  () => `quote:library:${props.mode}:edit`,
);
const libraryDeletePermission = computed(
  () => `quote:library:${props.mode}:delete`,
);
const canEdit = hasAccessByCodes([
  libraryEditPermission.value,
  props.editPermission,
]);
const canDelete = hasAccessByCodes([
  libraryDeletePermission.value,
  props.editPermission,
]);
const canManage = canEdit || canDelete;

const searchFormOptions = useI18nFormOptions(() => ({
  collapsed: true,
  schema: props.searchSchema(),
  showCollapseButton: true,
  submitOnChange: false,
}));

const highlightHandlers = createCostRowHighlightStyleHandlers();
const relationFocus = useRelationFocus({
  getPageRows: () => lastPageItems,
  gridApi: () => gridApi,
  mode: props.mode as CostMode,
});
const ruleHintMap = ref<Record<string, string>>({});
/** 最近一次 query 返回的当前页行，供关联跳转定位 */
let lastPageItems: QuoteLibraryRow[] = [];
const selectedCount = ref(0);
const selectedIds = ref<number[]>([]);
const activeTemplate = ref<CostTableTemplate>(
  getDefaultTemplate(props.mode as CostMode),
);

const editDrawerRef = ref<InstanceType<typeof QuoteLibraryEditDrawer>>();
const batchModalRef = ref<InstanceType<typeof QuoteLibraryBatchEditModal>>();
const exporting = ref(false);

function onActionClick(params: OnActionClickParams<QuoteLibraryRow>) {
  if (params.code === 'edit') {
    onEdit(params.row);
  }
  if (params.code === 'delete') {
    onDelete(params.row);
  }
}

const gridColumns = computed(() => {
  void isMobile.value;
  return injectRelationColumn(
    adaptCostColumnsForViewport(
      useQuoteLibraryColumns(
        props.mode,
        ruleHintMap.value,
        onActionClick,
        canManage,
        activeTemplate.value,
      ),
    ),
    {
      direction: 'quote-to-cost',
      onNavigate: (row) =>
        navigateToCostLibrary(router, props.mode as CostMode, row.id),
    },
  );
});

async function refreshTemplates(options?: { force?: boolean }) {
  try {
    const loaded = await loadTableTemplates(props.mode as CostMode, options);
    activeTemplate.value =
      resolveActiveTemplate(loaded, props.mode as CostMode) ??
      getDefaultTemplate(props.mode as CostMode);
  } catch {
    activeTemplate.value = getDefaultTemplate(props.mode as CostMode);
  }
}

const gridClass = computed(() => {
  const classes = ['quote-grid', 'cost-library-grid'];
  if (props.mode === 'road') {
    classes.push('road-cost-grid');
  }
  if (props.mode === 'sea') {
    classes.push('sea-cost-grid');
  }
  return classes.join(' ');
});

const toolbarConfig = computed(() => ({
  custom: true,
  refresh: true,
  search: !isMobile.value,
  zoom: !isMobile.value,
}));

function resolveRowClassName(params: { row: QuoteLibraryRow }) {
  const classes = [
    highlightHandlers.rowClassName(params),
    relationFocus.relationFocusRowClass(params),
  ].filter(Boolean);
  return classes.join(' ');
}

const [Grid, gridApi] = useVbenVxeGrid({
  formOptions: searchFormOptions.value,
  gridEvents: {
    checkboxAll: onCheckboxAll,
    checkboxChange: onCheckboxChange,
    dataRendered: () => {
      relationFocus.onDataRendered(lastPageItems);
    },
  },
  gridOptions: {
    columns: gridColumns.value,
    checkboxConfig: {
      reserve: true,
    },
    id: quoteLibraryGridId(props.mode),
    height: 'auto',
    pagerConfig: {},
    proxyConfig: {
      autoLoad: true,
      ajax: {
        query: async ({ page, sort }, formValues) => {
          const result = await fetchList({
            page: page.currentPage,
            pageSize: page.pageSize,
            sortField: sort.field,
            sortOrder: sort.order,
            ...formValues,
          });
          lastPageItems = result.items ?? [];
          return result;
        },
      },
      sort: true,
    },
    rowClassName: resolveRowClassName,
    rowStyle: highlightHandlers.rowStyle,
    rowConfig: {
      keyField: 'id',
    },
    scrollX: { enabled: true },
    sortConfig: {
      remote: true,
      trigger: 'default',
    },
    toolbarConfig: toolbarConfig.value,
    ...createTemplateColumnBgStyleHandlers(),
  } as VxeTableGridOptions<QuoteLibraryRow>,
});

watch(isMobile, (mobile) => {
  gridApi.setGridOptions({
    toolbarConfig: {
      custom: true,
      refresh: true,
      search: !mobile,
      zoom: !mobile,
    },
  });
});

watch(gridColumns, (columns) => {
  gridApi.setGridOptions({ columns });
});

function syncSelection() {
  selectedCount.value = selectedIds.value.length;
}

function onCheckboxChange(params: { checked: boolean; row: QuoteLibraryRow }) {
  const rowId = params.row?.id;
  if (typeof rowId !== 'number') {
    return;
  }
  const next = new Set(selectedIds.value);
  if (params.checked) {
    next.add(rowId);
  } else {
    next.delete(rowId);
  }
  selectedIds.value = [...next];
  syncSelection();
}

function onCheckboxAll(params: { checked: boolean }) {
  const $grid = gridApi.grid as null | {
    getTableData?: () => { tableData?: QuoteLibraryRow[] };
  };
  const pageRows = $grid?.getTableData?.()?.tableData ?? [];
  const pageIds = pageRows
    .map((row) => row.id)
    .filter((id): id is number => typeof id === 'number');
  const next = new Set(selectedIds.value);
  for (const id of pageIds) {
    if (params.checked) {
      next.add(id);
    } else {
      next.delete(id);
    }
  }
  selectedIds.value = [...next];
  syncSelection();
}

function getSelectedIds() {
  return [...selectedIds.value];
}

function clearSelection() {
  selectedIds.value = [];
  gridApi.grid?.clearCheckboxRow?.();
  syncSelection();
}

function onRefresh() {
  gridApi.query();
}

function isQuoteOrderLocked(row?: null | QuoteLibraryRow) {
  return row?.quoteOrderLocked === true;
}

function warnQuoteOrderLocked() {
  message.warning($t('page.quote.library.hint.quoteOrderLocked'));
}

function onEdit(row: QuoteLibraryRow) {
  if (!canEdit || typeof row.id !== 'number') {
    return;
  }
  if (isQuoteOrderLocked(row)) {
    warnQuoteOrderLocked();
    return;
  }
  editDrawerRef.value?.open(row.id);
}

function getRowName(row: QuoteLibraryRow) {
  const record = row as unknown as Record<string, unknown>;
  if (props.mode === 'road') {
    const zip = String(record.zipCode ?? '').trim();
    const city = String(record.city ?? '').trim();
    const por = String(record.por ?? '').trim();
    return [zip, city, por].filter(Boolean).join(' / ') || String(row.id ?? '');
  }
  if (props.mode === 'sea') {
    const por = String(record.por ?? '').trim();
    const pol = String(record.pol ?? '').trim();
    const pod = String(record.pod ?? '').trim();
    return [por, pol, pod].filter(Boolean).join(' / ') || String(row.id ?? '');
  }
  const region = String(record.region ?? '').trim();
  const station = String(record.station ?? '').trim();
  return [region, station].filter(Boolean).join(' / ') || String(row.id ?? '');
}

function onDelete(row: QuoteLibraryRow) {
  if (!canDelete || typeof row.id !== 'number') {
    return;
  }
  if (isQuoteOrderLocked(row)) {
    warnQuoteOrderLocked();
    return;
  }
  const name = getRowName(row);
  Modal.confirm({
    content: $t('page.quote.library.confirm.delete', [name]),
    onOk: async () => {
      await deleteQuoteLibraryRecord(props.mode, row.id as number);
      message.success($t('ui.actionMessage.deleteSuccess', [name]));
      clearSelection();
      onRefresh();
    },
    title: $t('page.quote.library.confirm.deleteTitle'),
  });
}

function findRowById(id: number) {
  return lastPageItems.find((row) => row.id === id);
}

function getEditableSelectedIds() {
  return getSelectedIds().filter((id) => !isQuoteOrderLocked(findRowById(id)));
}

function onBatchEdit() {
  const ids = getEditableSelectedIds();
  if (ids.length === 0) {
    if (getSelectedIds().length > 0) {
      warnQuoteOrderLocked();
      return;
    }
    message.warning($t('page.costLibrary.hint.selectRows'));
    return;
  }
  batchModalRef.value?.open(ids);
}

function onBatchDelete() {
  const ids = getEditableSelectedIds();
  if (ids.length === 0) {
    if (getSelectedIds().length > 0) {
      warnQuoteOrderLocked();
      return;
    }
    message.warning($t('page.costLibrary.hint.selectRows'));
    return;
  }
  Modal.confirm({
    content: $t('page.quote.library.confirm.batchDelete', [ids.length]),
    onOk: async () => {
      await batchDeleteQuoteLibrary(props.mode, ids);
      message.success($t('ui.actionMessage.operationSuccess'));
      clearSelection();
      onRefresh();
    },
    title: $t('page.quote.library.confirm.deleteTitle'),
  });
}

function onBatchSuccess() {
  clearSelection();
  onRefresh();
}

function normalizeListParams(formValues?: null | Record<string, unknown>) {
  const params = { ...formValues };
  if (props.mode === 'road') {
    const normalizedCity = normalizeRoadCitySearchParam(
      params.city as string | undefined,
    );
    if (normalizedCity) {
      params.city = normalizedCity;
    } else {
      delete params.city;
    }
  }
  return params;
}

function resolveExportColumns() {
  const fromGrid = collectQuoteLibraryExportColumns(
    gridApi.grid as Parameters<typeof collectQuoteLibraryExportColumns>[0],
  );
  if (fromGrid.length > 0) {
    return fromGrid;
  }
  return fallbackQuoteLibraryExportColumns(props.mode);
}

async function onExport() {
  exporting.value = true;
  const hideLoading = message.loading({
    content: $t('page.costLibrary.hint.exporting'),
    duration: 0,
    key: 'quote_library_export_msg',
  });
  try {
    const formValues = await gridApi.formApi?.getLatestSubmissionValues?.();
    const columns = resolveExportColumns();
    const exportParams: Record<string, unknown> = {
      ...buildListExportParams(
        normalizeListParams(formValues),
        getSelectedIds(),
      ),
    };
    if (columns.length > 0) {
      exportParams.columns = JSON.stringify(columns);
    }
    const blob = await exportQuoteLibrary(props.mode, exportParams);
    await downloadCostExport(blob as Blob, props.exportFilename);
    message.success({
      content: $t('page.costLibrary.hint.exportSuccess'),
      key: 'quote_library_export_msg',
    });
  } catch {
    hideLoading();
  } finally {
    exporting.value = false;
  }
}

async function loadQuoteRuleHints() {
  try {
    const rules = await getQuoteRuleList({ status: 1 });
    ruleHintMap.value = buildQuoteLibraryRuleHintMap(rules);
  } catch {
    ruleHintMap.value = {};
  }
}

onMounted(() => {
  void refreshTemplates();
  void loadQuoteRuleHints();
});

onActivated(() => {
  void refreshTemplates({ force: true });
});
</script>

<template>
  <Page
    auto-content-height
    :description="$t(descriptionKey)"
    :title="$t(titleKey)"
  >
    <Grid :form-options="searchFormOptions" :grid-class="gridClass">
      <template #toolbar-tools>
        <div class="quote-library-toolbar">
          <Button :loading="exporting" @click="onExport">
            <Download class="size-3.5" />
            {{ $t('page.costLibrary.actions.export') }}
          </Button>
          <template v-if="canManage">
            <Button
              v-if="canEdit"
              :disabled="selectedCount === 0"
              type="primary"
              @click="onBatchEdit"
            >
              {{ $t('page.costLibrary.actions.batchEdit') }}
            </Button>
            <Button
              v-if="canDelete"
              :disabled="selectedCount === 0"
              danger
              @click="onBatchDelete"
            >
              {{ $t('page.costLibrary.actions.batchDelete') }}
            </Button>
            <span
              v-if="selectedCount > 0"
              class="text-sm text-muted-foreground"
            >
              {{ $t('page.costLibrary.hint.batchSelected', [selectedCount]) }}
            </span>
          </template>
        </div>
      </template>
    </Grid>
    <QuoteLibraryEditDrawer
      v-if="canEdit"
      ref="editDrawerRef"
      :mode="mode"
      @success="onRefresh"
    />
    <QuoteLibraryBatchEditModal
      v-if="canEdit"
      ref="batchModalRef"
      :mode="mode"
      @success="onBatchSuccess"
    />
  </Page>
</template>
