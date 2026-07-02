<script lang="ts" setup>
import type {
  OnActionClickParams,
  VxeTableGridOptions,
} from '#/adapter/vxe-table';
import type { CurrencyApi } from '#/api/currency';

import { useAccess } from '@vben/access';
import { Page, useVbenModal } from '@vben/common-ui';
import { Plus } from '@vben/icons';

import { Button, message } from 'ant-design-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { deleteCurrency, getCurrencyList } from '#/api/currency';
import { $t } from '#/locales';

import { useI18nFormOptions } from '../../shared/use-i18n-form-options';
import {
  filterCurrencies,
  useCurrencyColumns,
  useCurrencySearchSchema,
} from './data';
import Form from './modules/form.vue';

import '../../system/shared/system.css';

const { hasAccessByCodes } = useAccess();
const canManage = hasAccessByCodes(['currency:manage']);

const [FormModal, formModalApi] = useVbenModal({
  connectedComponent: Form,
  destroyOnClose: true,
});

function onCreate() {
  formModalApi.setData({}).open();
}

function onEdit(row: CurrencyApi.Currency) {
  formModalApi.setData(row).open();
}

function onDelete(row: CurrencyApi.Currency) {
  const hideLoading = message.loading({
    content: $t('ui.actionMessage.deleting', [row.name]),
    duration: 0,
    key: 'currency_delete_msg',
  });
  deleteCurrency(row.id)
    .then(() => {
      message.success({
        content: $t('ui.actionMessage.deleteSuccess', [row.name]),
        key: 'currency_delete_msg',
      });
      gridApi.query();
    })
    .catch(() => hideLoading());
}

function onActionClick({
  code,
  row,
}: OnActionClickParams<CurrencyApi.Currency>) {
  if (code === 'edit') {
    onEdit(row);
  }
  if (code === 'delete') {
    onDelete(row);
  }
}

const searchFormOptions = useI18nFormOptions(() => ({
  collapsed: false,
  schema: useCurrencySearchSchema(),
  showCollapseButton: false,
  submitOnChange: false,
}));

const [Grid, gridApi] = useVbenVxeGrid({
  formOptions: searchFormOptions.value,
  gridOptions: {
    columns: useCurrencyColumns(onActionClick, canManage),
    height: 'auto',
    pagerConfig: { enabled: false },
    proxyConfig: {
      ajax: {
        query: async (_ctx, formValues) => {
          const list = await getCurrencyList();
          const items = filterCurrencies(list, formValues);
          return { items, total: items.length };
        },
      },
    },
    rowConfig: { keyField: 'id' },
    toolbarConfig: {
      custom: true,
      refresh: true,
      search: true,
      zoom: true,
    },
  } as VxeTableGridOptions<CurrencyApi.Currency>,
});
</script>

<template>
  <Page auto-content-height :description="$t('page.masterData.hint.currency')">
    <FormModal @success="gridApi.query()" />
    <Grid class="system-grid" :form-options="searchFormOptions">
      <template #toolbar-tools>
        <Button v-if="canManage" type="primary" @click="onCreate">
          <Plus class="size-4" />
          {{ $t('page.masterData.actions.createCurrency') }}
        </Button>
      </template>
      <template #code="{ row }">
        <span class="sys-code">{{ row.code }}</span>
      </template>
    </Grid>
  </Page>
</template>
