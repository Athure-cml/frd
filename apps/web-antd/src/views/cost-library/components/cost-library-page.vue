<script lang="ts" setup>
import type { Component } from 'vue';

import type { VbenFormSchema } from '#/adapter/form';
import type {
  OnActionClickParams,
  VxeTableGridOptions,
} from '#/adapter/vxe-table';
import type {
  CostHighlightView,
  CostMode,
  CostTableTemplate,
} from '#/api/cost';
import type {
  AiCostPrefillMode,
  AiCostPrefillPayload,
} from '#/components/ai-assistant/ai-prefill-cost';

import {
  computed,
  nextTick,
  onActivated,
  onDeactivated,
  onMounted,
  onUnmounted,
  ref,
  watch,
} from 'vue';
import { useRouter } from 'vue-router';

import { useAccess } from '@vben/access';
import { Page, useVbenDrawer } from '@vben/common-ui';
import { ArrowUpToLine, Download, Plus, Settings } from '@vben/icons';
import { usePreferences } from '@vben/preferences';

import { Button, Dropdown, Menu, message, Modal, Tag } from 'ant-design-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  downloadCostExport,
  getCostApi,
  unmarkCostHighlight,
} from '#/api/cost';
import {
  aiPrefillEventName,
  consumeAiCostPrefill,
} from '#/components/ai-assistant/ai-prefill-cost';
import { $t } from '#/locales';

import { buildListExportParams } from '../../shared/export-params';
import { useI18nFormOptions } from '../../shared/use-i18n-form-options';
import { createTemplateColumnBgStyleHandlers } from '../shared/column-bg-style';
import { adaptCostColumnsForViewport } from '../shared/columns';
import { getDefaultTemplate } from '../shared/default-templates';
import { toCopyDrawerData, toRenewDrawerData } from '../shared/drawer-data';
import { createHighlightOnlySearchField } from '../shared/highlight-only-search';
import { createCostRowHighlightStyleHandlers } from '../shared/row-highlight-style';
import {
  getGridStorageId,
  getTemplateLayoutSignature,
  invalidateTableTemplateCache,
  loadTableTemplates,
  resolveActiveTemplate,
  saveTemplateId,
} from '../shared/use-table-templates';
import BatchCopyModal from './batch-copy-modal.vue';
import BatchEditModal from './batch-edit-modal.vue';
import HighlightColorModal from './highlight-color-modal.vue';
import ImportModal from './import-modal.vue';

import '../shared/cost-library.css';

const props = defineProps<{
  batchEditSchema: VbenFormSchema[];
  batchEditTitle: string;
  columns: (
    onActionClick: (params: OnActionClickParams<any>) => void,
    canEdit: boolean,
    template?: CostTableTemplate,
  ) => VxeTableGridOptions['columns'];
  createLabel: string;
  description: string;
  editPermission: string;
  /** 开启后展示批量复制（卡车/海运） */
  enableBatchCopy?: boolean;
  exportFilename: string;
  formComponent: Component;
  getRowName: (row: any) => string;
  gridClass?: string;
  importTitle: string;
  mode: CostMode;
  scrollX?: boolean;
  searchSchema: () => VbenFormSchema[];
}>();

const api = getCostApi(props.mode);
const router = useRouter();
const { hasAccessByCodes } = useAccess();
const { isMobile } = usePreferences();
const canEdit = hasAccessByCodes([props.editPermission]);
const canViewTemplates = hasAccessByCodes([`cost:${props.mode}:template:view`]);
const toolbarSize = computed(() => (isMobile.value ? 'small' : 'middle'));
const pageDescription = computed(() =>
  isMobile.value ? undefined : props.description,
);

/** Guard async writes after leave; avoid loadColumn on disposed KeepAlive grid. */
let pageAlive = true;
let templateRequestId = 0;
let mobileAdaptTimer: null | ReturnType<typeof setTimeout> = null;
/** 已应用到表格的模板布局签名，避免远程模板与内置相同时二次 loadColumn */
let appliedLayoutSignature = '';

const importModalRef = ref<InstanceType<typeof ImportModal>>();
const batchModalRef = ref<InstanceType<typeof BatchEditModal>>();
const batchCopyModalRef = ref<InstanceType<typeof BatchCopyModal>>();
const highlightModalRef = ref<InstanceType<typeof HighlightColorModal>>();
const selectedCount = ref(0);
const selectedIds = ref<number[]>([]);
/** 勾选行中本部门已标记的 ID（用于控制「取消常用」可见性） */
const selectedViewerMarkedIds = ref<number[]>([]);
const selectingAllPages = ref(false);
const crossPageSelectActive = ref(false);
const searchResultTotal = ref(0);
const lastSearchKey = ref('');
const lastSort = ref<{ field?: string; order?: string }>({});
const exporting = ref(false);
const templates = ref<CostTableTemplate[]>([getDefaultTemplate(props.mode)]);
const activeTemplateId = ref(getDefaultTemplate(props.mode).id);

const activeTemplate = computed(
  () =>
    templates.value.find((item) => item.id === activeTemplateId.value) ??
    getDefaultTemplate(props.mode),
);

function resolveColumns() {
  return adaptCostColumnsForViewport(
    props.columns(onActionClick, canEdit, activeTemplate.value),
  );
}

function applyTemplate(force = false) {
  if (!pageAlive) {
    return;
  }
  const signature = getTemplateLayoutSignature(activeTemplate.value);
  if (!force && signature && signature === appliedLayoutSignature) {
    return;
  }
  const columns = resolveColumns();
  try {
    gridApi.setGridOptions({
      columns,
      id: getGridStorageId(
        props.mode,
        activeTemplateId.value,
        activeTemplate.value.layout,
      ),
    });
  } catch {
    return;
  }
  void nextTick(() => {
    if (!pageAlive) {
      return;
    }
    const $grid = gridApi.grid as null | {
      loadColumn?: (cols: typeof columns) => void;
      recalculate?: (refull?: boolean) => void;
    };
    if (!$grid) {
      return;
    }
    try {
      $grid.loadColumn?.(columns);
      $grid.recalculate?.(true);
      appliedLayoutSignature = signature;
    } catch {
      // grid may already be disposed during KeepAlive switch
    }
  });
}

function onManageTemplates() {
  invalidateTableTemplateCache(props.mode);
  router.push({
    path: `/cost-library/templates/${props.mode}`,
  });
}

async function refreshTemplates(options?: { force?: boolean }) {
  const requestId = ++templateRequestId;
  try {
    const loaded = await loadTableTemplates(props.mode, options);
    if (!pageAlive || requestId !== templateRequestId) {
      return;
    }
    templates.value = loaded;
    const active = resolveActiveTemplate(loaded, props.mode);
    if (active) {
      activeTemplateId.value = active.id;
      saveTemplateId(props.mode, active.id);
      applyTemplate();
    }
  } catch {
    // keep default template when fetch fails
  }
}

const [FormDrawer, formDrawerApi] = useVbenDrawer({
  connectedComponent: props.formComponent,
  class:
    props.mode === 'road' || props.mode === 'fumigation'
      ? 'w-full sm:w-[720px]'
      : 'w-full sm:w-[520px]',
  destroyOnClose: true,
});

function onCreate() {
  formDrawerApi.setData({ template: activeTemplate.value }).open();
}

function openCreateWithPrefill(fields: Record<string, unknown>) {
  if (!canEdit) {
    message.warning($t('page.ai.proposeNoEditPermission'));
    return;
  }
  formDrawerApi
    .setData({
      ...fields,
      aiPrefill: true,
      template: activeTemplate.value,
    })
    .open();
}

function applyAiCostPrefill(payload: AiCostPrefillPayload | null) {
  if (!payload?.fields || payload.mode !== props.mode) {
    return;
  }
  void nextTick(() => openCreateWithPrefill(payload.fields));
}

function onAiCostPrefillEvent() {
  applyAiCostPrefill(consumeAiCostPrefill(props.mode as AiCostPrefillMode));
}

onMounted(() => {
  pageAlive = true;
  refreshTemplates();
  applyAiCostPrefill(consumeAiCostPrefill(props.mode as AiCostPrefillMode));
  window.addEventListener(aiPrefillEventName(props.mode), onAiCostPrefillEvent);
  void nextTick(() => patchSearchFormReset());
});

onActivated(() => {
  pageAlive = true;
  // 标签切回时强制同步列，避免 KeepAlive/HMR 后表体空白且无 loading
  appliedLayoutSignature = '';
  refreshTemplates();
  applyAiCostPrefill(consumeAiCostPrefill(props.mode as AiCostPrefillMode));
  void nextTick(() => patchSearchFormReset());
});

onDeactivated(() => {
  pageAlive = false;
  templateRequestId += 1;
  if (mobileAdaptTimer) {
    clearTimeout(mobileAdaptTimer);
    mobileAdaptTimer = null;
  }
});

onUnmounted(() => {
  pageAlive = false;
  templateRequestId += 1;
  if (mobileAdaptTimer) {
    clearTimeout(mobileAdaptTimer);
    mobileAdaptTimer = null;
  }
  window.removeEventListener(
    aiPrefillEventName(props.mode),
    onAiCostPrefillEvent,
  );
});

function onEdit(row: any) {
  formDrawerApi.setData({ ...row, template: activeTemplate.value }).open();
}

function onCopy(row: any) {
  formDrawerApi.setData(toCopyDrawerData(row, activeTemplate.value)).open();
}

function onRenew(row: any) {
  formDrawerApi.setData(toRenewDrawerData(row, activeTemplate.value)).open();
}

function onDelete(row: any) {
  const name = props.getRowName(row);
  const hideLoading = message.loading({
    content: $t('ui.actionMessage.deleting', [name]),
    duration: 0,
    key: 'cost_action_msg',
  });
  api
    .delete(row.id)
    .then(() => {
      message.success({
        content: $t('ui.actionMessage.deleteSuccess', [name]),
        key: 'cost_action_msg',
      });
      syncSelection();
      gridApi.query();
    })
    .catch(() => hideLoading());
}

function onActionClick(params: OnActionClickParams<any>) {
  if (params.code === 'edit') {
    onEdit(params.row);
  }
  if (params.code === 'renew') {
    onRenew(params.row);
  }
  if (params.code === 'copy') {
    onCopy(params.row);
  }
  if (params.code === 'delete') {
    onDelete(params.row);
  }
}

function getSelectedIds() {
  return [...selectedIds.value];
}

const selectedIdSet = computed(() => new Set(selectedIds.value));

type CostGridRow = {
  highlight?: CostHighlightView | null;
  id?: number;
};

function isViewerDeptMarked(row?: CostGridRow | null) {
  return row?.highlight?.viewerDeptMarked === true;
}

function syncViewerMarkedIdsFromRows(rows: CostGridRow[]) {
  const next = new Set(selectedViewerMarkedIds.value);
  for (const row of rows) {
    if (typeof row.id !== 'number' || !selectedIdSet.value.has(row.id)) {
      continue;
    }
    if (isViewerDeptMarked(row)) {
      next.add(row.id);
    } else {
      next.delete(row.id);
    }
  }
  selectedViewerMarkedIds.value = [...next];
}

function getCurrentPageRows(): CostGridRow[] {
  const $grid = gridApi.grid as null | {
    getTableData?: () => { tableData?: Array<{ id?: number }> };
  };
  return $grid?.getTableData?.()?.tableData ?? [];
}

let applyingSelection = false;
/** 最近一次 query 返回的当前页行，供 dataRendered 回显勾选 */
let lastPageItems: CostGridRow[] = [];

async function applySelectionToRows(rows?: Array<{ id?: number }>) {
  applyingSelection = true;
  try {
    await nextTick();
    const $grid = gridApi.grid as null | {
      clearCheckboxRow?: () => void;
      setCheckboxRow?: (rows: Array<{ id?: number }>, checked: boolean) => void;
    };
    if (!$grid) {
      return;
    }
    if (selectedIds.value.length === 0) {
      $grid.clearCheckboxRow?.();
      return;
    }
    const pageRows = rows?.length ? rows : getCurrentPageRows();
    if (pageRows.length === 0) {
      return;
    }
    const active = selectedIdSet.value;
    const toUncheck = pageRows.filter(
      (row) => typeof row.id === 'number' && !active.has(row.id),
    );
    const toCheck = pageRows.filter(
      (row) => typeof row.id === 'number' && active.has(row.id),
    );
    if (toUncheck.length > 0) {
      $grid.setCheckboxRow?.(toUncheck, false);
    }
    if (toCheck.length > 0) {
      $grid.setCheckboxRow?.(toCheck, true);
    }
  } finally {
    applyingSelection = false;
  }
}

function updateSelectedIds(updater: (current: Set<number>) => void) {
  const next = new Set(selectedIds.value);
  updater(next);
  selectedIds.value = [...next];
  syncSelection();
}

function syncSelection() {
  selectedCount.value = selectedIds.value.length;
  if (crossPageSelectActive.value && selectedCount.value === 0) {
    crossPageSelectActive.value = false;
  }
}

function clearSelection() {
  selectedIds.value = [];
  selectedViewerMarkedIds.value = [];
  crossPageSelectActive.value = false;
  gridApi.grid?.clearCheckboxRow?.();
  syncSelection();
}

function onSearchCriteriaChange() {
  selectedIds.value = [];
  selectedViewerMarkedIds.value = [];
  crossPageSelectActive.value = false;
  gridApi.grid?.clearCheckboxRow?.();
  syncSelection();
}

function onCheckboxChange(params: { checked: boolean; row: CostGridRow }) {
  if (applyingSelection) {
    return;
  }
  const rowId = params.row?.id;
  if (typeof rowId !== 'number') {
    return;
  }
  updateSelectedIds((current) => {
    if (params.checked) {
      current.add(rowId);
    } else {
      current.delete(rowId);
    }
  });
  const marked = new Set(selectedViewerMarkedIds.value);
  if (params.checked && isViewerDeptMarked(params.row)) {
    marked.add(rowId);
  } else {
    marked.delete(rowId);
  }
  selectedViewerMarkedIds.value = [...marked];
}

function onCheckboxAll(params: { checked: boolean }) {
  if (applyingSelection) {
    return;
  }
  const pageRows = getCurrentPageRows();
  const pageIds = pageRows
    .map((row) => row.id)
    .filter((id): id is number => typeof id === 'number');
  updateSelectedIds((current) => {
    for (const id of pageIds) {
      if (params.checked) {
        current.add(id);
      } else {
        current.delete(id);
      }
    }
  });
  const marked = new Set(selectedViewerMarkedIds.value);
  for (const row of pageRows) {
    if (typeof row.id !== 'number') {
      continue;
    }
    if (params.checked && isViewerDeptMarked(row)) {
      marked.add(row.id);
    } else if (!params.checked) {
      marked.delete(row.id);
    }
  }
  selectedViewerMarkedIds.value = [...marked];
}

type PatchedResetFn = (() => Promise<void>) & {
  __costSelectionPatched?: boolean;
};

function patchSearchFormReset() {
  const formApi = gridApi.formApi as
    | undefined
    | {
        getState?: () => { handleReset?: PatchedResetFn };
        setState?: (patch: { handleReset: PatchedResetFn }) => void;
      };
  if (!formApi?.getState || !formApi?.setState) {
    return;
  }
  const original = formApi.getState()?.handleReset;
  if (!original || original.__costSelectionPatched) {
    return;
  }
  const patched: PatchedResetFn = async () => {
    lastSearchKey.value = '';
    onSearchCriteriaChange();
    await original();
  };
  patched.__costSelectionPatched = true;
  formApi.setState({ handleReset: patched });
}

async function onSelectAllAcrossPages() {
  if (selectingAllPages.value) {
    return;
  }
  const formValues = await gridApi.formApi?.getLatestSubmissionValues?.();
  selectingAllPages.value = true;
  const hideLoading = message.loading({
    content: $t('page.costLibrary.hint.selectAllAcrossPagesLoading'),
    duration: 0,
    key: 'cost_select_all_msg',
  });
  try {
    const ids = await api.listIds({
      ...normalizeListParams(formValues),
      sortField: lastSort.value.field,
      sortOrder: lastSort.value.order,
    });
    if (ids.length === 0) {
      message.warning({
        content: $t('page.costLibrary.hint.selectAllAcrossPagesEmpty'),
        key: 'cost_select_all_msg',
      });
      return;
    }
    selectedIds.value = ids;
    crossPageSelectActive.value = true;
    await applySelectionToRows(lastPageItems);
    syncSelection();
    message.success({
      content: $t('page.costLibrary.hint.selectAllAcrossPagesSuccess', [
        ids.length,
      ]),
      key: 'cost_select_all_msg',
    });
  } catch {
    hideLoading();
  } finally {
    selectingAllPages.value = false;
  }
}

function onBatchSuccess() {
  clearSelection();
  onRefresh();
}

function onBatchDelete() {
  const ids = getSelectedIds();
  if (ids.length === 0) {
    message.warning($t('page.costLibrary.hint.selectRows'));
    return;
  }
  Modal.confirm({
    content: $t('page.costLibrary.confirm.batchDelete', [ids.length]),
    onOk: async () => {
      await api.batchDelete(ids);
      message.success($t('ui.actionMessage.operationSuccess'));
      onBatchSuccess();
    },
    title: $t('common.prompt'),
  });
}

function onBatchEdit() {
  const ids = getSelectedIds();
  if (ids.length === 0) {
    message.warning($t('page.costLibrary.hint.selectRows'));
    return;
  }
  batchModalRef.value?.open(ids);
}

function onBatchCopy() {
  const ids = getSelectedIds();
  if (ids.length === 0) {
    message.warning($t('page.costLibrary.hint.selectRows'));
    return;
  }
  batchCopyModalRef.value?.open(ids);
}

function onMarkHighlight() {
  const ids = getSelectedIds();
  if (ids.length === 0) {
    message.warning($t('page.costLibrary.hint.selectRows'));
    return;
  }
  highlightModalRef.value?.open(ids);
}

function onUnmarkHighlight() {
  const ids = [...selectedViewerMarkedIds.value];
  if (ids.length === 0) {
    message.warning($t('page.costLibrary.highlight.unmarkNone'));
    return;
  }
  Modal.confirm({
    content: $t('page.costLibrary.highlight.unmarkConfirm', [ids.length]),
    onOk: async () => {
      await unmarkCostHighlight(props.mode, ids);
      message.success($t('page.costLibrary.highlight.unmarkSuccess'));
      onBatchSuccess();
    },
    title: $t('common.prompt'),
  });
}

function normalizeListParams(formValues?: Record<string, unknown>) {
  const params = { ...formValues } as Record<string, unknown>;
  if (params.highlightOnly !== true) {
    delete params.highlightOnly;
  }
  return params;
}

async function onExport() {
  exporting.value = true;
  const hideLoading = message.loading({
    content: $t('page.costLibrary.hint.exporting'),
    duration: 0,
    key: 'cost_export_msg',
  });
  try {
    const formValues = await gridApi.formApi?.getLatestSubmissionValues?.();
    const blob = await api.export(
      buildListExportParams(formValues, getSelectedIds(), {
        templateId: activeTemplateId.value,
      }),
    );
    await downloadCostExport(blob as Blob, props.exportFilename);
    message.success({
      content: $t('page.costLibrary.hint.exportSuccess'),
      key: 'cost_export_msg',
    });
  } catch {
    hideLoading();
  } finally {
    exporting.value = false;
  }
}

function onImport() {
  importModalRef.value?.open();
}

const searchFormOptions = useI18nFormOptions(() => {
  void isMobile.value;
  return {
    // collapse search by default
    collapsed: true,
    collapsedRows: 1,
    schema: [...props.searchSchema(), createHighlightOnlySearchField()],
    showCollapseButton: true,
    submitOnChange: false,
  };
});

const [Grid, gridApi] = useVbenVxeGrid({
  formOptions: searchFormOptions.value,
  gridEvents: {
    checkboxAll: onCheckboxAll,
    checkboxChange: onCheckboxChange,
    dataRendered: () => {
      syncViewerMarkedIdsFromRows(lastPageItems);
      void applySelectionToRows(lastPageItems);
      syncSelection();
    },
  },
  gridOptions: {
    checkboxConfig: {
      highlight: true,
      reserve: false,
    },
    columns: resolveColumns(),
    // 由 .cost-library-grid CSS 覆盖全局 height:auto，保证加载态可见
    height: '100%',
    id: getGridStorageId(
      props.mode,
      activeTemplateId.value,
      activeTemplate.value.layout,
    ),
    pagerConfig: {},
    proxyConfig: {
      ajax: {
        query: async ({ page, sort }, formValues) => {
          lastSort.value = { field: sort.field, order: sort.order };
          const searchKey = JSON.stringify(formValues ?? {});
          if (searchKey !== lastSearchKey.value) {
            lastSearchKey.value = searchKey;
            onSearchCriteriaChange();
          }
          const result = await api.list({
            page: page.currentPage,
            pageSize: page.pageSize,
            sortField: sort.field,
            sortOrder: sort.order,
            ...normalizeListParams(formValues),
          });
          lastPageItems = result.items ?? [];
          searchResultTotal.value = result.total;
          return result;
        },
      },
      sort: true,
    },
    rowConfig: {
      keyField: 'id',
    },
    // 远程排序：按当前搜索条件全库排序后再分页
    sortConfig: {
      remote: true,
      trigger: 'default',
    },
    scrollX: props.scrollX ? { enabled: true } : undefined,
    toolbarConfig: {
      custom: true,
      refresh: true,
      // hide circular search on mobile to avoid clutter
      search: !isMobile.value,
      zoom: !isMobile.value,
    },
    ...createTemplateColumnBgStyleHandlers(),
    ...createCostRowHighlightStyleHandlers(),
  } as VxeTableGridOptions,
});

watch(isMobile, (mobile) => {
  if (!pageAlive) {
    return;
  }
  gridApi.setGridOptions({
    toolbarConfig: {
      custom: true,
      refresh: true,
      search: !mobile,
      zoom: !mobile,
    },
  });
  // debounce: avoid loadColumn thrash when resizing / navigating
  if (mobileAdaptTimer) {
    clearTimeout(mobileAdaptTimer);
  }
  mobileAdaptTimer = setTimeout(() => {
    mobileAdaptTimer = null;
    if (!pageAlive) {
      return;
    }
    applyTemplate(true);
  }, 120);
});

const createBtnLabel = computed(() =>
  isMobile.value
    ? $t('page.costLibrary.actions.createShort')
    : props.createLabel,
);
const templateBtnLabel = computed(() =>
  isMobile.value
    ? $t('page.costLibrary.actions.templateShort')
    : $t('page.costLibrary.template.manage'),
);
const batchEditBtnLabel = computed(() =>
  isMobile.value
    ? $t('page.costLibrary.actions.batchEditShort')
    : $t('page.costLibrary.actions.batchEdit'),
);
const batchCopyBtnLabel = computed(() =>
  isMobile.value
    ? $t('page.costLibrary.actions.batchCopyShort')
    : $t('page.costLibrary.actions.batchCopy'),
);
const batchDeleteBtnLabel = computed(() =>
  isMobile.value
    ? $t('page.costLibrary.actions.batchDeleteShort')
    : $t('page.costLibrary.actions.batchDelete'),
);

const highlightMenuItems = computed(() => [
  {
    disabled: selectedCount.value === 0,
    key: 'mark',
    label: $t('page.costLibrary.highlight.mark'),
  },
  {
    disabled: selectedViewerMarkedIds.value.length === 0,
    key: 'unmark',
    label: $t('page.costLibrary.highlight.unmark'),
  },
]);

const batchMenuItems = computed(() => {
  const disabled = selectedCount.value === 0;
  const items: Array<Record<string, unknown>> = [
    {
      disabled,
      key: 'edit',
      label: batchEditBtnLabel.value,
    },
  ];
  if (props.enableBatchCopy) {
    items.push({
      disabled,
      key: 'copy',
      label: batchCopyBtnLabel.value,
    });
  }
  items.push(
    { type: 'divider' },
    {
      danger: true,
      disabled,
      key: 'delete',
      label: batchDeleteBtnLabel.value,
    },
  );
  return items;
});

function onHighlightMenuClick({ key }: { key: string }) {
  if (key === 'mark') {
    onMarkHighlight();
  }
  if (key === 'unmark') {
    onUnmarkHighlight();
  }
}

function onBatchMenuClick({ key }: { key: string }) {
  if (key === 'edit') {
    onBatchEdit();
  }
  if (key === 'copy') {
    onBatchCopy();
  }
  if (key === 'delete') {
    onBatchDelete();
  }
}

function onRefresh() {
  gridApi.query();
}
</script>

<template>
  <Page :auto-content-height="!isMobile" :description="pageDescription">
    <FormDrawer @success="onRefresh" />
    <ImportModal
      ref="importModalRef"
      :enrich-road-zip="props.mode === 'road'"
      :import-fn="
        (file, options) =>
          api.importExcel(file, activeTemplateId, options?.dryRun)
      "
      :title="importTitle"
      @success="onRefresh"
    />
    <BatchEditModal
      ref="batchModalRef"
      :batch-update-fn="(ids, fields) => api.batchUpdate({ ids, fields })"
      :schema="batchEditSchema"
      :title="batchEditTitle"
      :wide="mode === 'sea' || mode === 'road'"
      @success="onBatchSuccess"
    />
    <BatchCopyModal
      v-if="enableBatchCopy"
      ref="batchCopyModalRef"
      :mode="mode === 'sea' ? 'sea' : 'road'"
      :template="activeTemplate"
      @success="onBatchSuccess"
    />
    <HighlightColorModal
      ref="highlightModalRef"
      :mode="mode"
      @success="onBatchSuccess"
    />
    <Grid
      :form-options="searchFormOptions"
      :grid-class="gridClass ?? 'cost-library-grid'"
    >
      <template #toolbar-tools>
        <div class="cost-toolbar">
          <div class="cost-toolbar__group">
            <Button
              v-if="canViewTemplates"
              :size="toolbarSize"
              @click="onManageTemplates"
            >
              <Settings class="size-3.5" />
              {{ templateBtnLabel }}
            </Button>
            <Button
              v-if="canEdit"
              :size="toolbarSize"
              type="primary"
              @click="onCreate"
            >
              <Plus class="size-3.5" />
              {{ createBtnLabel }}
            </Button>
            <Button v-if="canEdit" :size="toolbarSize" @click="onImport">
              <ArrowUpToLine class="size-3.5" />
              {{ $t('page.costLibrary.actions.import') }}
            </Button>
            <Button :loading="exporting" :size="toolbarSize" @click="onExport">
              <Download class="size-3.5" />
              {{ $t('page.costLibrary.actions.export') }}
            </Button>
          </div>
          <div class="cost-toolbar__group cost-toolbar__group--batch">
            <Tag v-if="selectedCount > 0" class="m-0" color="processing">
              {{ $t('page.costLibrary.hint.selectedCount', [selectedCount]) }}
            </Tag>
            <Button
              v-if="!crossPageSelectActive"
              :loading="selectingAllPages"
              :size="toolbarSize"
              @click="onSelectAllAcrossPages"
            >
              {{ $t('page.costLibrary.actions.selectAllAcrossPages') }}
            </Button>
            <Button
              v-if="crossPageSelectActive"
              class="cost-clear-selection-btn"
              ghost
              type="primary"
              :size="toolbarSize"
              @click="clearSelection"
            >
              {{ $t('page.costLibrary.actions.clearSelection') }}
            </Button>
            <Dropdown :trigger="['click']">
              <Button :size="toolbarSize">
                {{ $t('page.costLibrary.highlight.markMenu') }}
              </Button>
              <template #overlay>
                <Menu
                  :items="highlightMenuItems"
                  @click="onHighlightMenuClick"
                />
              </template>
            </Dropdown>
            <Dropdown
              v-if="canEdit"
              :disabled="selectedCount === 0"
              :trigger="['click']"
            >
              <Button :disabled="selectedCount === 0" :size="toolbarSize">
                {{ $t('page.costLibrary.actions.batchMenu') }}
              </Button>
              <template #overlay>
                <Menu :items="batchMenuItems" @click="onBatchMenuClick" />
              </template>
            </Dropdown>
          </div>
        </div>
      </template>
    </Grid>
  </Page>
</template>
