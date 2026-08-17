<script lang="ts" setup>
import type { SupplierCategory } from './data';

import type {
  OnActionClickParams,
  VxeTableGridOptions,
} from '#/adapter/vxe-table';
import type { SupplierApi } from '#/api/supplier';

import { computed, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';

import { useAccess } from '@vben/access';
import { Page, useVbenModal } from '@vben/common-ui';
import { ArrowUpToLine, Download, Plus } from '@vben/icons';

import { Button, message, Modal, Tag } from 'ant-design-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  batchDeleteSupplier,
  deleteSupplier,
  downloadSupplierExport,
  exportSupplier,
  getSupplierList,
  getSupplierTypeList,
  importSupplier,
  pinSupplier,
  reorderSupplier,
  unpinSupplier,
} from '#/api/supplier';
import { $t } from '#/locales';
import { useInternalCodeVisibility } from '#/utils/internal-code-access';

import ImportModal from '../../cost-library/components/import-modal.vue';
import {
  buildListExportParams,
  getGridSelectedIds,
} from '../../shared/export-params';
import {
  buildPartyRowDragGridOptions,
  collectGridRowIds,
} from '../../shared/party-row-drag';
import { useI18nFormOptions } from '../../shared/use-i18n-form-options';
import {
  buildSupplierSearchSchema,
  categoryExportFilename,
  categoryHintKey,
  categoryTitleKey,
  supportsTypes,
  useSupplierColumns,
} from './data';
import Form from './modules/form.vue';
import TypeManageModal from './modules/type-manage-modal.vue';

import '../../customer/shared/customer.css';

const route = useRoute();
const { hasAccessByCodes } = useAccess();
const { canViewInternalCodes } = useInternalCodeVisibility();

const category = computed<SupplierCategory>(() => {
  const raw = String(route.meta.supplierCategory ?? 'TRUCK').toUpperCase();
  if (
    raw === 'FUMIGATION' ||
    raw === 'YARD' ||
    raw === 'OTHER' ||
    raw === 'TRUCK'
  ) {
    return raw;
  }
  return 'TRUCK';
});

const permPrefix = computed(() => `supplier:${category.value.toLowerCase()}`);
const canCreate = computed(() =>
  hasAccessByCodes([`${permPrefix.value}:create`]),
);
const canEdit = computed(() => hasAccessByCodes([`${permPrefix.value}:edit`]));
const canDelete = computed(() =>
  hasAccessByCodes([`${permPrefix.value}:delete`]),
);
const canView = computed(() => hasAccessByCodes([`${permPrefix.value}:view`]));

const pageTitle = computed(() =>
  $t(`page.supplier.${categoryTitleKey(category.value)}`),
);
const pageHint = computed(() =>
  $t(`page.supplier.${categoryHintKey(category.value)}`),
);
const gridId = computed(() => `supplier-list-${category.value}`);

const importModalRef = ref<InstanceType<typeof ImportModal>>();
const typeManageRef = ref<InstanceType<typeof TypeManageModal>>();
const exporting = ref(false);
const typeOptions = ref<Array<{ label: string; value: string }>>([]);
const typeNameMap = ref<Record<string, string>>({});

async function loadTypeOptions() {
  if (!supportsTypes(category.value)) {
    typeOptions.value = [];
    typeNameMap.value = {};
    return;
  }
  const list = await getSupplierTypeList({ enabledOnly: true });
  typeOptions.value = list.map((item) => ({
    label: item.name,
    value: String(item.id),
  }));
  const map: Record<string, string> = {};
  for (const item of list) {
    map[String(item.id)] = item.name;
  }
  // 也加载全部（含停用）以便历史数据显示名称
  const all = await getSupplierTypeList();
  for (const item of all) {
    map[String(item.id)] = item.name;
  }
  typeNameMap.value = map;
}

const [FormModal, formModalApi] = useVbenModal({
  connectedComponent: Form,
  destroyOnClose: true,
});

function onCreate() {
  formModalApi.setData({}).open();
}

function onEdit(row: SupplierApi.Supplier) {
  formModalApi.setData(row).open();
}

function onDelete(row: SupplierApi.Supplier) {
  const hideLoading = message.loading({
    content: $t('ui.actionMessage.deleting', [row.name]),
    duration: 0,
    key: 'supplier_delete_msg',
  });
  deleteSupplier(row.id)
    .then(() => {
      message.success({
        content: $t('ui.actionMessage.deleteSuccess', [row.name]),
        key: 'supplier_delete_msg',
      });
      gridApi.query();
    })
    .catch(() => hideLoading());
}

function clearSelection() {
  gridApi.grid?.clearCheckboxRow?.();
  gridApi.grid?.clearCheckboxReserve?.();
}

function onBatchDelete() {
  const ids = getGridSelectedIds(gridApi);
  if (ids.length === 0) {
    message.warning($t('page.supplier.hint.selectRows'));
    return;
  }
  Modal.confirm({
    content: $t('page.supplier.confirm.batchDelete', [ids.length]),
    onOk: async () => {
      await batchDeleteSupplier(ids);
      message.success($t('ui.actionMessage.operationSuccess'));
      clearSelection();
      gridApi.query();
    },
    title: $t('common.prompt'),
  });
}

function onTogglePin(row: SupplierApi.Supplier, pinned: boolean) {
  const key = 'supplier_pin_msg';
  const hideLoading = message.loading({
    content: pinned
      ? $t('page.supplier.hint.pinning')
      : $t('page.supplier.hint.unpinning'),
    duration: 0,
    key,
  });
  const request = pinned ? pinSupplier(row.id) : unpinSupplier(row.id);
  request
    .then(() => {
      message.success({
        content: pinned
          ? $t('page.supplier.hint.pinSuccess', [row.name])
          : $t('page.supplier.hint.unpinSuccess', [row.name]),
        key,
      });
      gridApi.query();
    })
    .catch(() => hideLoading());
}

function onActionClick({
  code,
  row,
}: OnActionClickParams<SupplierApi.Supplier>) {
  if (code === 'edit') {
    onEdit(row);
  }
  if (code === 'delete') {
    onDelete(row);
  }
  if (code === 'pin') {
    onTogglePin(row, true);
  }
  if (code === 'unpin') {
    onTogglePin(row, false);
  }
}

async function onExport() {
  exporting.value = true;
  const hideLoading = message.loading({
    content: $t('page.supplier.hint.exporting'),
    duration: 0,
    key: 'supplier_export_msg',
  });
  try {
    const formValues = await gridApi.formApi?.getLatestSubmissionValues?.();
    const blob = await exportSupplier({
      category: category.value,
      ...buildListExportParams(formValues, getGridSelectedIds(gridApi)),
    });
    await downloadSupplierExport(
      blob as Blob,
      categoryExportFilename(category.value),
    );
    message.success({
      content: $t('page.supplier.hint.exportSuccess'),
      key: 'supplier_export_msg',
    });
  } catch {
    hideLoading();
  } finally {
    exporting.value = false;
  }
}

async function onRowDragend() {
  if (!canEdit.value) {
    return;
  }
  const ids = collectGridRowIds(gridApi.grid);
  if (ids.length === 0) {
    return;
  }
  const key = 'supplier_reorder_msg';
  const hideLoading = message.loading({
    content: $t('page.supplier.hint.reordering'),
    duration: 0,
    key,
  });
  try {
    await reorderSupplier(ids);
    message.success({
      content: $t('page.supplier.hint.reorderSuccess'),
      key,
    });
  } catch {
    hideLoading();
  } finally {
    gridApi.query();
  }
}

function buildColumns() {
  return useSupplierColumns(
    category.value,
    onActionClick,
    canEdit.value,
    canDelete.value,
    canViewInternalCodes.value,
    typeNameMap.value,
  );
}

const searchFormOptions = useI18nFormOptions(() => ({
  collapsed: true,
  schema: buildSupplierSearchSchema(
    category.value,
    canViewInternalCodes.value,
    typeOptions.value,
  ),
  showCollapseButton: true,
  submitOnChange: false,
}));

const [Grid, gridApi] = useVbenVxeGrid({
  formOptions: searchFormOptions.value,
  gridEvents: {
    rowDragend: onRowDragend,
  },
  gridOptions: {
    id: gridId.value,
    checkboxConfig: {
      highlight: true,
      reserve: true,
      showReserveStatus: true,
    },
    columns: buildColumns(),
    height: 'auto',
    pagerConfig: {},
    proxyConfig: {
      ajax: {
        query: async ({ page }, formValues) => {
          return await getSupplierList({
            category: category.value,
            page: page.currentPage,
            pageSize: page.pageSize,
            ...formValues,
          });
        },
      },
    },
    ...buildPartyRowDragGridOptions(canEdit.value, 'page.supplier'),
    toolbarConfig: {
      custom: true,
      refresh: true,
      search: true,
      zoom: true,
    },
  } as VxeTableGridOptions<SupplierApi.Supplier>,
});

async function refreshSchemaAndColumns() {
  await loadTypeOptions();
  gridApi.setGridOptions({
    columns: buildColumns(),
    id: gridId.value,
    ...buildPartyRowDragGridOptions(canEdit.value, 'page.supplier'),
  });
  searchFormOptions.value = {
    collapsed: true,
    schema: buildSupplierSearchSchema(
      category.value,
      canViewInternalCodes.value,
      typeOptions.value,
    ),
    showCollapseButton: true,
    submitOnChange: false,
  };
}

watch([canViewInternalCodes, category], () => {
  void refreshSchemaAndColumns();
});

onMounted(() => {
  void refreshSchemaAndColumns();
});

function onRefresh() {
  void loadTypeOptions().then(() => {
    gridApi.setGridOptions({ columns: buildColumns(), id: gridId.value });
    gridApi.query();
  });
}

async function importFn(file: File) {
  return importSupplier(file, category.value);
}
</script>

<template>
  <Page auto-content-height :description="pageHint" :title="pageTitle">
    <FormModal @success="onRefresh" />
    <TypeManageModal ref="typeManageRef" @success="onRefresh" />
    <ImportModal
      ref="importModalRef"
      :import-fn="importFn"
      :title="$t('page.supplier.actions.import')"
      @success="onRefresh"
    />
    <Grid class="customer-grid" :form-options="searchFormOptions">
      <template #toolbar-tools>
        <Button
          v-if="canEdit && supportsTypes(category)"
          class="mr-2"
          @click="typeManageRef?.open()"
        >
          {{ $t('page.supplier.type.manage') }}
        </Button>
        <Button v-if="canCreate" class="mr-2" @click="importModalRef?.open()">
          <ArrowUpToLine class="size-4" />
          {{ $t('page.supplier.actions.import') }}
        </Button>
        <Button
          v-if="canView"
          :loading="exporting"
          class="mr-2"
          @click="onExport"
        >
          <Download class="size-4" />
          {{ $t('page.supplier.actions.export') }}
        </Button>
        <Button v-if="canDelete" class="mr-2" danger @click="onBatchDelete">
          {{ $t('page.supplier.actions.batchDelete') }}
        </Button>
        <Button v-if="canCreate" type="primary" @click="onCreate">
          <Plus class="size-4" />
          {{ $t('page.supplier.actions.create') }}
        </Button>
      </template>
      <template v-if="canViewInternalCodes" #code="{ row }">
        <span class="customer-code">{{ row.code }}</span>
      </template>
      <template #name="{ row }">
        <span class="party-name-cell">
          <span class="party-name-text" :title="row.name">{{ row.name }}</span>
          <Tag v-if="row.pinnedAt" class="party-pin-tag" color="processing">
            {{ $t('page.supplier.badge.pinned') }}
          </Tag>
        </span>
      </template>
    </Grid>
  </Page>
</template>
