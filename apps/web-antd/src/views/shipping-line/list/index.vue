<script lang="ts" setup>
import type {
  OnActionClickParams,
  VxeTableGridOptions,
} from '#/adapter/vxe-table';
import type { ShippingLineApi } from '#/api/shipping-line';

import { ref, watch } from 'vue';

import { useAccess } from '@vben/access';
import { Page, useVbenModal } from '@vben/common-ui';
import { ArrowUpToLine, Download, Plus } from '@vben/icons';

import { Button, message, Modal, Tag } from 'ant-design-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  batchDeleteShippingLine,
  deleteShippingLine,
  downloadShippingLineExport,
  exportShippingLine,
  getShippingLineList,
  importShippingLine,
  pinShippingLine,
  reorderShippingLine,
  unpinShippingLine,
} from '#/api/shipping-line';
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
import { buildShippingLineSearchSchema, useShippingLineColumns } from './data';
import Form from './modules/form.vue';

import '../../customer/shared/customer.css';

const { hasAccessByCodes } = useAccess();
const { canViewInternalCodes } = useInternalCodeVisibility();
const canCreate = hasAccessByCodes(['shipping_line:create']);
const canEdit = hasAccessByCodes(['shipping_line:edit']);
const canDelete = hasAccessByCodes(['shipping_line:delete']);
const canView = hasAccessByCodes(['shipping_line:view']);

const importModalRef = ref<InstanceType<typeof ImportModal>>();
const exporting = ref(false);

const [FormModal, formModalApi] = useVbenModal({
  connectedComponent: Form,
  destroyOnClose: true,
});

function onCreate() {
  formModalApi.setData({}).open();
}

function onEdit(row: ShippingLineApi.ShippingLine) {
  formModalApi.setData(row).open();
}

function onDelete(row: ShippingLineApi.ShippingLine) {
  const hideLoading = message.loading({
    content: $t('ui.actionMessage.deleting', [row.name]),
    duration: 0,
    key: 'shipping_line_delete_msg',
  });
  deleteShippingLine(row.id)
    .then(() => {
      message.success({
        content: $t('ui.actionMessage.deleteSuccess', [row.name]),
        key: 'shipping_line_delete_msg',
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
    message.warning($t('page.shippingLine.hint.selectRows'));
    return;
  }
  Modal.confirm({
    content: $t('page.shippingLine.confirm.batchDelete', [ids.length]),
    onOk: async () => {
      await batchDeleteShippingLine(ids);
      message.success($t('ui.actionMessage.operationSuccess'));
      clearSelection();
      gridApi.query();
    },
    title: $t('common.prompt'),
  });
}

function onTogglePin(row: ShippingLineApi.ShippingLine, pinned: boolean) {
  const key = 'shipping_line_pin_msg';
  const hideLoading = message.loading({
    content: pinned
      ? $t('page.shippingLine.hint.pinning')
      : $t('page.shippingLine.hint.unpinning'),
    duration: 0,
    key,
  });
  const request = pinned ? pinShippingLine(row.id) : unpinShippingLine(row.id);
  request
    .then(() => {
      message.success({
        content: pinned
          ? $t('page.shippingLine.hint.pinSuccess', [row.name])
          : $t('page.shippingLine.hint.unpinSuccess', [row.name]),
        key,
      });
      gridApi.query();
    })
    .catch(() => hideLoading());
}

function onActionClick({
  code,
  row,
}: OnActionClickParams<ShippingLineApi.ShippingLine>) {
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
    content: $t('page.shippingLine.hint.exporting'),
    duration: 0,
    key: 'shipping_line_export_msg',
  });
  try {
    const formValues = await gridApi.formApi?.getLatestSubmissionValues?.();
    const blob = await exportShippingLine(
      buildListExportParams(formValues, getGridSelectedIds(gridApi)),
    );
    await downloadShippingLineExport(blob as Blob, '船公—xlsx');
    message.success({
      content: $t('page.shippingLine.hint.exportSuccess'),
      key: 'shipping_line_export_msg',
    });
  } catch {
    hideLoading();
  } finally {
    exporting.value = false;
  }
}

async function onRowDragend() {
  if (!canEdit) {
    return;
  }
  const ids = collectGridRowIds(gridApi.grid);
  if (ids.length === 0) {
    return;
  }
  const key = 'shipping_line_reorder_msg';
  const hideLoading = message.loading({
    content: $t('page.shippingLine.hint.reordering'),
    duration: 0,
    key,
  });
  try {
    await reorderShippingLine(ids);
    message.success({
      content: $t('page.shippingLine.hint.reorderSuccess'),
      key,
    });
  } catch {
    hideLoading();
  } finally {
    gridApi.query();
  }
}

function buildColumns() {
  return useShippingLineColumns(
    onActionClick,
    canEdit,
    canDelete,
    canViewInternalCodes.value,
  );
}

const searchFormOptions = useI18nFormOptions(() => ({
  collapsed: true,
  schema: buildShippingLineSearchSchema(canViewInternalCodes.value),
  showCollapseButton: true,
  submitOnChange: false,
}));

const [Grid, gridApi] = useVbenVxeGrid({
  formOptions: searchFormOptions.value,
  gridEvents: {
    rowDragend: onRowDragend,
  },
  gridOptions: {
    id: 'shipping-line-list',
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
          return await getShippingLineList({
            page: page.currentPage,
            pageSize: page.pageSize,
            ...formValues,
          });
        },
      },
    },
    ...buildPartyRowDragGridOptions(canEdit, 'page.shippingLine'),
    toolbarConfig: {
      custom: true,
      refresh: true,
      search: true,
      zoom: true,
    },
  } as VxeTableGridOptions<ShippingLineApi.ShippingLine>,
});

watch(canViewInternalCodes, () => {
  gridApi.setGridOptions({ columns: buildColumns() });
});

function onRefresh() {
  gridApi.query();
}
</script>

<template>
  <Page
    auto-content-height
    :description="$t('page.shippingLine.hint.list')"
    :title="$t('page.shippingLine.list')"
  >
    <FormModal @success="onRefresh" />
    <ImportModal
      ref="importModalRef"
      :import-fn="importShippingLine"
      :title="$t('page.shippingLine.actions.import')"
      @success="onRefresh"
    />
    <Grid class="customer-grid" :form-options="searchFormOptions">
      <template #toolbar-tools>
        <Button v-if="canCreate" class="mr-2" @click="importModalRef?.open()">
          <ArrowUpToLine class="size-4" />
          {{ $t('page.shippingLine.actions.import') }}
        </Button>
        <Button
          v-if="canView"
          :loading="exporting"
          class="mr-2"
          @click="onExport"
        >
          <Download class="size-4" />
          {{ $t('page.shippingLine.actions.export') }}
        </Button>
        <Button v-if="canDelete" class="mr-2" danger @click="onBatchDelete">
          {{ $t('page.shippingLine.actions.batchDelete') }}
        </Button>
        <Button v-if="canCreate" type="primary" @click="onCreate">
          <Plus class="size-4" />
          {{ $t('page.shippingLine.actions.create') }}
        </Button>
      </template>
      <template v-if="canViewInternalCodes" #code="{ row }">
        <span class="customer-code">{{ row.code }}</span>
      </template>
      <template #name="{ row }">
        <span class="party-name-cell">
          <span class="party-name-text" :title="row.name">{{ row.name }}</span>
          <Tag v-if="row.pinnedAt" class="party-pin-tag" color="processing">
            {{ $t('page.shippingLine.badge.pinned') }}
          </Tag>
        </span>
      </template>
    </Grid>
  </Page>
</template>
