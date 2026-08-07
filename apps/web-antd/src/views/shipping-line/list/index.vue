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

import { Button, message } from 'ant-design-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  deleteShippingLine,
  downloadShippingLineExport,
  exportShippingLine,
  getShippingLineList,
  importShippingLine,
} from '#/api/shipping-line';
import { $t } from '#/locales';
import { useInternalCodeVisibility } from '#/utils/internal-code-access';

import ImportModal from '../../cost-library/components/import-modal.vue';
import {
  buildListExportParams,
  getGridSelectedIds,
} from '../../shared/export-params';
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
  gridOptions: {
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
    rowConfig: {
      keyField: 'id',
    },
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
        <Button v-if="canCreate" type="primary" @click="onCreate">
          <Plus class="size-4" />
          {{ $t('page.shippingLine.actions.create') }}
        </Button>
      </template>
      <template v-if="canViewInternalCodes" #code="{ row }">
        <span class="customer-code">{{ row.code }}</span>
      </template>
    </Grid>
  </Page>
</template>
