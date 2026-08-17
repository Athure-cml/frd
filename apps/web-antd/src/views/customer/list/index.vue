<script lang="ts" setup>
import type {
  OnActionClickParams,
  VxeTableGridOptions,
} from '#/adapter/vxe-table';
import type { CustomerApi } from '#/api/customer';

import { ref, watch } from 'vue';

import { useAccess } from '@vben/access';
import { Page, useVbenModal } from '@vben/common-ui';
import { ArrowUpToLine, Download, Plus } from '@vben/icons';

import { Button, message, Modal, Tag } from 'ant-design-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  batchDeleteCustomer,
  deleteCustomer,
  downloadCustomerExport,
  exportCustomer,
  getCustomerList,
  importCustomer,
  pinCustomer,
  reorderCustomer,
  unpinCustomer,
} from '#/api/customer';
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
import { buildCustomerSearchSchema, useCustomerColumns } from './data';
import Form from './modules/form.vue';

import '../shared/customer.css';

const { hasAccessByCodes } = useAccess();
const { canViewInternalCodes } = useInternalCodeVisibility();
const canCreate = hasAccessByCodes(['customer:create']);
const canEdit = hasAccessByCodes(['customer:edit']);
const canDelete = hasAccessByCodes(['customer:delete']);
const canView = hasAccessByCodes(['customer:view']);

const importModalRef = ref<InstanceType<typeof ImportModal>>();
const exporting = ref(false);

const [FormModal, formModalApi] = useVbenModal({
  connectedComponent: Form,
  destroyOnClose: true,
});

function onCreate() {
  formModalApi.setData({}).open();
}

function onEdit(row: CustomerApi.Customer) {
  formModalApi.setData(row).open();
}

function onDelete(row: CustomerApi.Customer) {
  const hideLoading = message.loading({
    content: $t('ui.actionMessage.deleting', [row.name]),
    duration: 0,
    key: 'customer_delete_msg',
  });
  deleteCustomer(row.id)
    .then(() => {
      message.success({
        content: $t('ui.actionMessage.deleteSuccess', [row.name]),
        key: 'customer_delete_msg',
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
    message.warning($t('page.customer.hint.selectRows'));
    return;
  }
  Modal.confirm({
    content: $t('page.customer.confirm.batchDelete', [ids.length]),
    onOk: async () => {
      await batchDeleteCustomer(ids);
      message.success($t('ui.actionMessage.operationSuccess'));
      clearSelection();
      gridApi.query();
    },
    title: $t('common.prompt'),
  });
}

function onTogglePin(row: CustomerApi.Customer, pinned: boolean) {
  const key = 'customer_pin_msg';
  const hideLoading = message.loading({
    content: pinned
      ? $t('page.customer.hint.pinning')
      : $t('page.customer.hint.unpinning'),
    duration: 0,
    key,
  });
  const request = pinned ? pinCustomer(row.id) : unpinCustomer(row.id);
  request
    .then(() => {
      message.success({
        content: pinned
          ? $t('page.customer.hint.pinSuccess', [row.name])
          : $t('page.customer.hint.unpinSuccess', [row.name]),
        key,
      });
      gridApi.query();
    })
    .catch(() => hideLoading());
}

function onActionClick({
  code,
  row,
}: OnActionClickParams<CustomerApi.Customer>) {
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
    content: $t('page.customer.hint.exporting'),
    duration: 0,
    key: 'customer_export_msg',
  });
  try {
    const formValues = await gridApi.formApi?.getLatestSubmissionValues?.();
    const blob = await exportCustomer(
      buildListExportParams(formValues, getGridSelectedIds(gridApi)),
    );
    await downloadCustomerExport(blob as Blob, '客户.xlsx');
    message.success({
      content: $t('page.customer.hint.exportSuccess'),
      key: 'customer_export_msg',
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
  const key = 'customer_reorder_msg';
  const hideLoading = message.loading({
    content: $t('page.customer.hint.reordering'),
    duration: 0,
    key,
  });
  try {
    await reorderCustomer(ids);
    message.success({
      content: $t('page.customer.hint.reorderSuccess'),
      key,
    });
  } catch {
    hideLoading();
  } finally {
    gridApi.query();
  }
}

function buildColumns() {
  return useCustomerColumns(
    onActionClick,
    canEdit,
    canDelete,
    canViewInternalCodes.value,
  );
}

const searchFormOptions = useI18nFormOptions(() => ({
  collapsed: true,
  schema: buildCustomerSearchSchema(canViewInternalCodes.value),
  showCollapseButton: true,
  submitOnChange: false,
}));

const dragGridOptions = buildPartyRowDragGridOptions(canEdit, 'page.customer');

const [Grid, gridApi] = useVbenVxeGrid({
  formOptions: searchFormOptions.value,
  gridEvents: {
    rowDragend: onRowDragend,
  },
  gridOptions: {
    id: 'customer-list',
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
          return await getCustomerList({
            page: page.currentPage,
            pageSize: page.pageSize,
            ...formValues,
          });
        },
      },
    },
    ...dragGridOptions,
    toolbarConfig: {
      custom: true,
      refresh: true,
      search: true,
      zoom: true,
    },
  } as VxeTableGridOptions<CustomerApi.Customer>,
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
    :description="$t('page.customer.hint.list')"
    :title="$t('page.customer.list')"
  >
    <FormModal @success="onRefresh" />
    <ImportModal
      ref="importModalRef"
      :import-fn="importCustomer"
      :title="$t('page.customer.actions.import')"
      @success="onRefresh"
    />
    <Grid class="customer-grid" :form-options="searchFormOptions">
      <template #toolbar-tools>
        <Button v-if="canCreate" class="mr-2" @click="importModalRef?.open()">
          <ArrowUpToLine class="size-4" />
          {{ $t('page.customer.actions.import') }}
        </Button>
        <Button
          v-if="canView"
          :loading="exporting"
          class="mr-2"
          @click="onExport"
        >
          <Download class="size-4" />
          {{ $t('page.customer.actions.export') }}
        </Button>
        <Button v-if="canDelete" class="mr-2" danger @click="onBatchDelete">
          {{ $t('page.customer.actions.batchDelete') }}
        </Button>
        <Button v-if="canCreate" type="primary" @click="onCreate">
          <Plus class="size-4" />
          {{ $t('page.customer.actions.create') }}
        </Button>
      </template>
      <template v-if="canViewInternalCodes" #code="{ row }">
        <span class="customer-code">{{ row.code }}</span>
      </template>
      <template #name="{ row }">
        <span class="party-name-cell">
          <span class="party-name-text" :title="row.name">{{ row.name }}</span>
          <Tag v-if="row.pinnedAt" class="party-pin-tag" color="processing">
            {{ $t('page.customer.badge.pinned') }}
          </Tag>
        </span>
      </template>
    </Grid>
  </Page>
</template>
