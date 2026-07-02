<script lang="ts" setup>
import type { Component } from 'vue';

import type { VbenFormSchema } from '#/adapter/form';
import type {
  OnActionClickParams,
  VxeTableGridOptions,
} from '#/adapter/vxe-table';
import type { CostMode, CostTableTemplate } from '#/api/cost';

import { computed, nextTick, onActivated, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

import { useAccess } from '@vben/access';
import { Page, useVbenDrawer } from '@vben/common-ui';
import { ArrowUpToLine, Download, Plus, Settings } from '@vben/icons';

import { Button, message, Modal, Tag } from 'ant-design-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { downloadCostExport, getCostApi } from '#/api/cost';
import { $t } from '#/locales';

import { useI18nFormOptions } from '../../shared/use-i18n-form-options';
import { getDefaultTemplate } from '../shared/default-templates';
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
const canEdit = hasAccessByCodes([props.editPermission]);
const canViewTemplates = hasAccessByCodes([`cost:${props.mode}:template:view`]);

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
  return props.columns(onActionClick, canEdit, activeTemplate.value);
}

function applyTemplate() {
  const columns = resolveColumns();
  gridApi.setGridOptions({
    columns,
    id: getGridStorageId(
      props.mode,
      activeTemplateId.value,
      activeTemplate.value.layout,
    ),
  });
  void nextTick(() => {
    const $grid = gridApi.grid as {
      loadColumn?: (cols: typeof columns) => void;
    };
    $grid?.loadColumn?.(columns);
  });
}

function onManageTemplates() {
  router.push({
    path: `/cost-library/templates/${props.mode}`,
  });
}

async function refreshTemplates() {
  try {
    const loaded = await loadTableTemplates(props.mode);
    templates.value = loaded;
    const active = resolveActiveTemplate(loaded, props.mode);
    if (active) {
      activeTemplateId.value = active.id;
      saveTemplateId(props.mode, active.id);
      applyTemplate();
    }
  } catch {
    // 使用内置默认模板
  }
}

onMounted(refreshTemplates);
onActivated(refreshTemplates);

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

function onEdit(row: any) {
  formDrawerApi.setData({ ...row, template: activeTemplate.value }).open();
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
  if (params.code === 'delete') {
    onDelete(params.row);
  }
}

function getSelectedIds() {
  const records = gridApi.grid?.getCheckboxRecords?.() ?? [];
  return records.map((row: { id: number }) => row.id);
}

function syncSelection() {
  selectedCount.value = getSelectedIds().length;
}

function clearSelection() {
  gridApi.grid?.clearCheckboxRow?.();
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
    const blob = await api.export({
      ...formValues,
      templateId: activeTemplateId.value,
    });
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

const searchFormOptions = useI18nFormOptions(() => ({
  collapsed: false,
  schema: props.searchSchema(),
  showCollapseButton: true,
  submitOnChange: false,
}));

const [Grid, gridApi] = useVbenVxeGrid({
  formOptions: searchFormOptions.value,
  gridEvents: {
    checkboxAll: syncSelection,
    checkboxChange: syncSelection,
  },
  gridOptions: {
    checkboxConfig: canEdit
      ? {
          highlight: true,
          reserve: true,
        }
      : undefined,
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
      search: true,
      zoom: true,
    },
  } as VxeTableGridOptions,
});

function onRefresh() {
  gridApi.query();
}
</script>

<template>
  <Page auto-content-height :description="description">
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
            <Button v-if="canViewTemplates" @click="onManageTemplates">
              <Settings class="size-4" />
              {{ $t('page.costLibrary.template.manage') }}
            </Button>
            <Button v-if="canEdit" type="primary" @click="onCreate">
              <Plus class="size-4" />
              {{ createLabel }}
            </Button>
            <Button v-if="canEdit" @click="onImport">
              <ArrowUpToLine class="size-4" />
              {{ $t('page.costLibrary.actions.import') }}
            </Button>
            <Button :loading="exporting" @click="onExport">
              <Download class="size-4" />
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
            <Button :disabled="selectedCount === 0" @click="onBatchEdit">
              {{ $t('page.costLibrary.actions.batchEdit') }}
            </Button>
            <Button
              danger
              :disabled="selectedCount === 0"
              @click="onBatchDelete"
            >
              {{ $t('page.costLibrary.actions.batchDelete') }}
            </Button>
          </div>
        </div>
      </template>
    </Grid>
  </Page>
</template>
