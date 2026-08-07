<script lang="ts" setup>
import type { Component } from 'vue';

import type { VbenFormSchema } from '#/adapter/form';
import type {
  OnActionClickParams,
  VxeTableGridOptions,
} from '#/adapter/vxe-table';
import type { CostMode, CostTableTemplate } from '#/api/cost';
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

import { Button, message, Modal, Tag } from 'ant-design-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { downloadCostExport, getCostApi } from '#/api/cost';
import {
  aiPrefillEventName,
  consumeAiCostPrefill,
} from '#/components/ai-assistant/ai-prefill-cost';
import { $t } from '#/locales';

import { buildListExportParams } from '../../shared/export-params';
import { useI18nFormOptions } from '../../shared/use-i18n-form-options';
import { adaptCostColumnsForViewport } from '../shared/columns';
import { getDefaultTemplate } from '../shared/default-templates';
import { toCopyDrawerData } from '../shared/drawer-data';
import {
  getGridStorageId,
  loadTableTemplates,
  resolveActiveTemplate,
  saveTemplateId,
} from '../shared/use-table-templates';
import BatchEditModal from './batch-edit-modal.vue';
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

const importModalRef = ref<InstanceType<typeof ImportModal>>();
const batchModalRef = ref<InstanceType<typeof BatchEditModal>>();
const selectedCount = ref(0);
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

function applyTemplate() {
  if (!pageAlive) {
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
    } catch {
      // grid may already be disposed during KeepAlive switch
    }
  });
}

function onManageTemplates() {
  router.push({
    path: `/cost-library/templates/${props.mode}`,
  });
}

async function refreshTemplates() {
  const requestId = ++templateRequestId;
  try {
    const loaded = await loadTableTemplates(props.mode);
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
});

onActivated(() => {
  pageAlive = true;
  refreshTemplates();
  applyAiCostPrefill(consumeAiCostPrefill(props.mode as AiCostPrefillMode));
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
  if (params.code === 'copy') {
    onCopy(params.row);
  }
  if (params.code === 'delete') {
    onDelete(params.row);
  }
}

function getSelectedIds() {
  const current = gridApi.grid?.getCheckboxRecords?.() ?? [];
  const reserved = gridApi.grid?.getCheckboxReserveRecords?.() ?? [];
  const ids = new Set<number>();
  for (const row of [...current, ...reserved] as Array<{ id?: number }>) {
    if (typeof row?.id === 'number') {
      ids.add(row.id);
    }
  }
  return [...ids];
}

function syncSelection() {
  selectedCount.value = getSelectedIds().length;
}

function clearSelection() {
  gridApi.grid?.clearCheckboxRow?.();
  gridApi.grid?.clearCheckboxReserve?.();
  syncSelection();
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
      clearSelection();
      gridApi.query();
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

function onBatchSuccess() {
  clearSelection();
  onRefresh();
}

const searchFormOptions = useI18nFormOptions(() => {
  void isMobile.value;
  return {
    // collapse search by default
    collapsed: true,
    collapsedRows: 1,
    schema: props.searchSchema(),
    showCollapseButton: true,
    submitOnChange: false,
  };
});

const [Grid, gridApi] = useVbenVxeGrid({
  formOptions: searchFormOptions.value,
  gridEvents: {
    checkboxAll: syncSelection,
    checkboxChange: syncSelection,
  },
  gridOptions: {
    checkboxConfig: {
      highlight: true,
      // cross-page reserve; header shows indeterminate when reserved
      reserve: true,
      showReserveStatus: true,
    },
    columns: resolveColumns(),
    height: 'auto',
    id: getGridStorageId(
      props.mode,
      activeTemplateId.value,
      activeTemplate.value.layout,
    ),
    pagerConfig: {},
    proxyConfig: {
      ajax: {
        query: async ({ page }, formValues) => {
          const result = await api.list({
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
    scrollX: props.scrollX ? { enabled: true } : undefined,
    toolbarConfig: {
      custom: true,
      refresh: true,
      // hide circular search on mobile to avoid clutter
      search: !isMobile.value,
      zoom: !isMobile.value,
    },
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
    applyTemplate();
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
const batchDeleteBtnLabel = computed(() =>
  isMobile.value
    ? $t('page.costLibrary.actions.batchDeleteShort')
    : $t('page.costLibrary.actions.batchDelete'),
);

function onRefresh() {
  gridApi.query();
}
</script>

<template>
  <Page :auto-content-height="!isMobile" :description="pageDescription">
    <FormDrawer @success="onRefresh" />
    <ImportModal
      ref="importModalRef"
      :import-fn="api.import"
      :title="importTitle"
      @success="onRefresh"
    />
    <BatchEditModal
      ref="batchModalRef"
      :batch-update-fn="(ids, fields) => api.batchUpdate({ ids, fields })"
      :schema="batchEditSchema"
      :title="batchEditTitle"
      @success="onBatchSuccess"
    />
    <Grid
      :class="gridClass ?? 'cost-library-grid'"
      :form-options="searchFormOptions"
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
          <div
            v-if="canEdit"
            class="cost-toolbar__group cost-toolbar__group--batch"
          >
            <Tag v-if="selectedCount > 0" class="m-0" color="processing">
              {{ $t('page.costLibrary.hint.selectedCount', [selectedCount]) }}
            </Tag>
            <Button
              :disabled="selectedCount === 0"
              :size="toolbarSize"
              @click="onBatchEdit"
            >
              {{ batchEditBtnLabel }}
            </Button>
            <Button
              danger
              :disabled="selectedCount === 0"
              :size="toolbarSize"
              @click="onBatchDelete"
            >
              {{ batchDeleteBtnLabel }}
            </Button>
          </div>
        </div>
      </template>
    </Grid>
  </Page>
</template>
