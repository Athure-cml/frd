<script lang="ts" setup>
import type {
  OnActionClickParams,
  VxeTableGridOptions,
} from '#/adapter/vxe-table';
import type { CustomerApi } from '#/api/customer';

import { watch } from 'vue';

import { useAccess } from '@vben/access';
import { Page, useVbenModal } from '@vben/common-ui';
import { Plus } from '@vben/icons';

import { Button, message } from 'ant-design-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { deleteCustomer, getCustomerList } from '#/api/customer';
import { $t } from '#/locales';
import { useInternalCodeVisibility } from '#/utils/internal-code-access';

import { useI18nFormOptions } from '../../shared/use-i18n-form-options';
import { buildCustomerSearchSchema, useCustomerColumns } from './data';
import Form from './modules/form.vue';

import '../shared/customer.css';

const { hasAccessByCodes } = useAccess();
const { canViewInternalCodes } = useInternalCodeVisibility();
const canCreate = hasAccessByCodes(['customer:create']);
const canEdit = hasAccessByCodes(['customer:edit']);
const canDelete = hasAccessByCodes(['customer:delete']);

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
  collapsed: false,
  schema: buildCustomerSearchSchema(canViewInternalCodes.value),
  showCollapseButton: true,
  submitOnChange: false,
}));

const [Grid, gridApi] = useVbenVxeGrid({
  formOptions: searchFormOptions.value,
  gridOptions: {
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
    rowConfig: {
      keyField: 'id',
    },
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
    <Grid class="customer-grid" :form-options="searchFormOptions">
      <template #toolbar-tools>
        <Button v-if="canCreate" type="primary" @click="onCreate">
          <Plus class="size-4" />
          {{ $t('page.customer.actions.create') }}
        </Button>
      </template>
      <template v-if="canViewInternalCodes" #code="{ row }">
        <span class="customer-code">{{ row.code }}</span>
      </template>
    </Grid>
  </Page>
</template>
