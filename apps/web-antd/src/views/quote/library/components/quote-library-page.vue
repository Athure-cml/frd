<script lang="ts" setup>
import type { QuoteLibraryMode } from '../shared/quote-library-columns';
import type { QuoteLibraryRow } from '../shared/quote-library-row';

import type { VbenFormSchema } from '#/adapter/form';
import type {
  OnActionClickParams,
  VxeTableGridOptions,
} from '#/adapter/vxe-table';
import type { CostMode, CostTableTemplate } from '#/api/cost';

import { computed, nextTick, onActivated, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';

import { useAccess } from '@vben/access';
import { Page } from '@vben/common-ui';
import { Download, Settings } from '@vben/icons';
import { usePreferences } from '@vben/preferences';

import { Button, Dropdown, Menu, message, Modal } from 'ant-design-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { downloadCostExport } from '#/api/cost';
import { getQuoteRuleList } from '#/api/quote-rule';
import {
  batchConfirmQuoteLibrary,
  batchDeleteQuoteLibrary,
  confirmQuoteLibraryRecord,
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
  navigateToQuoteListByLibrary,
  useRelationFocus,
} from '../../../cost-library/shared/cost-quote-relation';
import { getDefaultTemplate } from '../../../cost-library/shared/default-templates';
import { createCostRowHighlightStyleHandlers } from '../../../cost-library/shared/row-highlight-style';
import {
  scheduleGridRecalculate,
  useGridResizeRecalculate,
} from '../../../cost-library/shared/schedule-grid-recalculate';
import { normalizeQuoteLibraryStatusSearchParams } from '../../../cost-library/shared/status-search';
import {
  getGridStorageId,
  getTemplateLayoutSignature,
  invalidateTableTemplateCache,
  loadTableTemplates,
  resolveActiveTemplate,
} from '../../../cost-library/shared/use-table-templates';
import { buildListExportParams } from '../../../shared/export-params';
import { useI18nFormOptions } from '../../../shared/use-i18n-form-options';
import { buildQuoteLibraryRuleHintMap } from '../../shared/quote-rule-hints';
import {
  settleQuoteLibraryFixedColumns,
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
  exportFilename: string;
  mode: QuoteLibraryMode;
  searchSchema: () => VbenFormSchema[];
  titleKey: string;
}>();

const router = useRouter();
const { hasAccessByCodes } = useAccess();
const { isMobile } = usePreferences();
const fetchList = getQuoteLibraryListApi(props.mode);

/** 报价库权限与成本库独立，不再回落到 cost:*:edit */
const canEdit = hasAccessByCodes([`quote:library:${props.mode}:edit`]);
const canConfirm = hasAccessByCodes([`quote:library:${props.mode}:confirm`]);
const canDelete = hasAccessByCodes([`quote:library:${props.mode}:delete`]);
const canManage = canEdit || canConfirm || canDelete;
const columnPermissions = {
  canConfirm,
  canDelete,
  canEdit,
};
/** 「查看成本」需对应成本库查看权限 */
const canViewCost = hasAccessByCodes([`cost:${props.mode}:view`]);
const canViewTemplates = hasAccessByCodes([
  `quote:library:${props.mode}:template:view`,
]);

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
let appliedLayoutSignature = '';

const editDrawerRef = ref<InstanceType<typeof QuoteLibraryEditDrawer>>();
const batchModalRef = ref<InstanceType<typeof QuoteLibraryBatchEditModal>>();
const exporting = ref(false);

function onActionClick(params: OnActionClickParams<QuoteLibraryRow>) {
  if (params.code === 'confirm') {
    void onConfirm(params.row);
  }
  if (params.code === 'edit') {
    onEdit(params.row);
  }
  if (params.code === 'delete') {
    onDelete(params.row);
  }
}

const gridColumns = computed(() => {
  void isMobile.value;
  return settleQuoteLibraryFixedColumns(
    injectRelationColumn(
      adaptCostColumnsForViewport(
        useQuoteLibraryColumns(
          props.mode,
          ruleHintMap.value,
          onActionClick,
          canManage,
          activeTemplate.value,
          columnPermissions,
        ),
      ),
      {
        direction: 'quote-to-cost',
        onNavigate: (row) =>
          navigateToCostLibrary(router, props.mode as CostMode, row.id),
        onNavigateQuotes: (row) =>
          navigateToQuoteListByLibrary(router, props.mode as CostMode, row.id),
        showCostLink: canViewCost,
      },
    ),
  );
});

async function refreshTemplates(options?: { force?: boolean }) {
  try {
    const loaded = await loadTableTemplates(props.mode as CostMode, {
      ...options,
      library: 'quote',
    });
    activeTemplate.value =
      resolveActiveTemplate(loaded, props.mode as CostMode, 'quote') ??
      getDefaultTemplate(props.mode as CostMode);
    applyTemplateColumns();
  } catch {
    activeTemplate.value = getDefaultTemplate(props.mode as CostMode);
    applyTemplateColumns(true);
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
      // 数据渲染后布局高度通常已稳定，补一次横滚区域计算
      scheduleGridRecalculate(
        () =>
          gridApi.grid as null | {
            recalculate?: (refull?: boolean) => void;
          },
      );
    },
  },
  gridOptions: {
    columns: gridColumns.value,
    checkboxConfig: {
      reserve: true,
    },
    // 不落本地列宽/显隐缓存：否则会盖住模板列宽，或藏列后 fit 撑满导致无横滚
    customConfig: {
      storage: false,
    },
    // 禁止列宽自适应撑满：fit 为 true 时会把 scrollXWidth 拉成容器宽，自定义横条被隐藏
    fit: false,
    id: getGridStorageId(
      props.mode as CostMode,
      activeTemplate.value.id,
      activeTemplate.value.layout,
      'quote',
    ),
    // 勿用 auto：数据加载后表体变高，横向滚动条会被裁掉
    height: '100%',
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
            ...normalizeListParams(formValues),
          });
          const items = (result.items ?? []).map((row) => ({
            ...row,
            status:
              row.confirmStatus === 'pendingConfirm'
                ? 'pendingConfirm'
                : row.status,
          }));
          lastPageItems = items;
          return { ...result, items };
        },
      },
      sort: true,
    },
    rowClassName: resolveRowClassName,
    rowStyle: highlightHandlers.rowStyle,
    rowConfig: {
      keyField: 'id',
    },
    // 宽表始终保留横条轨道，避免菜单加载抖动时 overflowX 被误判关掉
    scrollbarConfig: {
      x: { visible: 'visible' },
    },
    // vxe 用自定义横条，必须保持 scrollX；原生条已被 CSS 隐藏
    scrollX: { enabled: true },
    // 表头过长省略，悬停显示完整标题
    showHeaderOverflow: 'tooltip',
    sortConfig: {
      remote: true,
      trigger: 'default',
    },
    toolbarConfig: toolbarConfig.value,
    ...createTemplateColumnBgStyleHandlers(),
  } as VxeTableGridOptions<QuoteLibraryRow>,
});

const gridHostRef = ref<HTMLElement | null>(null);
useGridResizeRecalculate(
  gridHostRef,
  () =>
    gridApi.grid as null | {
      recalculate?: (refull?: boolean) => void;
    },
);

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

function applyTemplateColumns(force = false) {
  const signature = getTemplateLayoutSignature(activeTemplate.value);
  if (!force && signature && signature === appliedLayoutSignature) {
    return;
  }
  const columns = gridColumns.value;
  gridApi.setGridOptions({
    columns,
    id: getGridStorageId(
      props.mode as CostMode,
      activeTemplate.value.id,
      activeTemplate.value.layout,
      'quote',
    ),
  });
  void nextTick(() => {
    const $grid = gridApi.grid as null | {
      loadColumn?: (cols: typeof columns) => void;
      recalculate?: (refull?: boolean) => void;
    };
    // 不再 resetColumn：会清空滚动态，和菜单加载叠在一起必闪横条
    $grid?.loadColumn?.(columns);
    appliedLayoutSignature = signature;
    scheduleGridRecalculate(
      () =>
        gridApi.grid as null | {
          recalculate?: (refull?: boolean) => void;
        },
    );
  });
}

watch(gridColumns, () => {
  applyTemplateColumns();
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

async function onConfirm(row: QuoteLibraryRow) {
  if (!canConfirm || typeof row.id !== 'number') {
    return;
  }
  if (row.confirmStatus !== 'pendingConfirm') {
    return;
  }
  await confirmQuoteLibraryRecord(props.mode, row.id as number);
  message.success($t('page.quote.library.hint.confirmSuccess'));
  clearSelection();
  onRefresh();
}

async function onDelete(row: QuoteLibraryRow) {
  if (!canDelete || typeof row.id !== 'number') {
    return;
  }
  if (isQuoteOrderLocked(row)) {
    warnQuoteOrderLocked();
    return;
  }
  const name = getRowName(row);
  await deleteQuoteLibraryRecord(props.mode, row.id as number);
  message.success($t('ui.actionMessage.deleteSuccess', [name]));
  clearSelection();
  onRefresh();
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

function getPendingConfirmSelectedIds() {
  return getSelectedIds().filter((id) => {
    const row = findRowById(id);
    return row?.confirmStatus === 'pendingConfirm';
  });
}

function onBatchConfirm() {
  const ids = getPendingConfirmSelectedIds();
  if (ids.length === 0) {
    message.warning($t('page.quote.library.hint.selectPendingConfirm'));
    return;
  }
  Modal.confirm({
    content: $t('page.quote.library.confirm.batchConfirm'),
    onOk: async () => {
      await batchConfirmQuoteLibrary(props.mode, ids);
      message.success($t('page.quote.library.hint.confirmSuccess'));
      clearSelection();
      onRefresh();
    },
    title: $t('page.quote.library.confirm.batchConfirmTitle'),
  });
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

const batchMenuItems = computed(() => {
  const disabled = selectedCount.value === 0;
  const items: Array<Record<string, unknown>> = [];
  if (canEdit) {
    items.push({
      disabled,
      key: 'edit',
      label: $t('page.costLibrary.actions.batchEdit'),
    });
  }
  if (canConfirm) {
    items.push({
      disabled,
      key: 'confirm',
      label: $t('page.quote.library.actions.batchConfirm'),
    });
  }
  if (canDelete) {
    if (items.length > 0) {
      items.push({ type: 'divider' });
    }
    items.push({
      danger: true,
      disabled,
      key: 'delete',
      label: $t('page.costLibrary.actions.batchDelete'),
    });
  }
  return items;
});

function onBatchMenuClick({ key }: { key: string }) {
  if (key === 'edit') {
    onBatchEdit();
  }
  if (key === 'confirm') {
    onBatchConfirm();
  }
  if (key === 'delete') {
    onBatchDelete();
  }
}

function onBatchSuccess() {
  clearSelection();
  onRefresh();
}

function normalizeListParams(formValues?: null | Record<string, unknown>) {
  const params = { ...formValues } as Record<string, unknown>;
  const statusParts = normalizeQuoteLibraryStatusSearchParams(params.status);
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
  if (props.mode === 'road') {
    const normalizedCity = normalizeRoadCitySearchParam(params.city);
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
  scheduleGridRecalculate(
    () =>
      gridApi.grid as null | {
        recalculate?: (refull?: boolean) => void;
      },
  );
});
</script>

<template>
  <Page
    auto-content-height
    :description="$t(descriptionKey)"
    :title="$t(titleKey)"
  >
    <div ref="gridHostRef" class="cost-library-grid-host h-full min-h-0">
      <Grid :form-options="searchFormOptions" :grid-class="gridClass">
        <template #toolbar-tools>
          <div class="quote-library-toolbar">
            <Button
              v-if="canViewTemplates"
              @click="
                invalidateTableTemplateCache(props.mode as CostMode, 'quote');
                router.push(`/quotes/library/templates/${props.mode}`);
              "
            >
              <Settings class="size-3.5" />
              {{ $t('page.quote.library.template.manage') }}
            </Button>
            <Button :loading="exporting" @click="onExport">
              <Download class="size-3.5" />
              {{ $t('page.costLibrary.actions.export') }}
            </Button>
            <template v-if="canManage">
              <Dropdown :disabled="selectedCount === 0" :trigger="['click']">
                <Button :disabled="selectedCount === 0">
                  {{ $t('page.costLibrary.actions.batchMenu') }}
                </Button>
                <template #overlay>
                  <Menu :items="batchMenuItems" @click="onBatchMenuClick" />
                </template>
              </Dropdown>
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
    </div>
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
