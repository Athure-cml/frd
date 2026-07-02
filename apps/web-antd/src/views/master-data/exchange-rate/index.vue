<script lang="ts" setup>
import type {
  OnActionClickParams,
  VxeTableGridOptions,
} from '#/adapter/vxe-table';
import type { ExchangeRateApi } from '#/api/exchange-rate';

import { useAccess } from '@vben/access';
import { Page, useVbenModal } from '@vben/common-ui';
import { Plus } from '@vben/icons';

import { Button, message } from 'ant-design-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { deleteExchangeRate, getExchangeRateList } from '#/api/exchange-rate';
import { $t } from '#/locales';

import { useI18nFormOptions } from '../../shared/use-i18n-form-options';
import {
  filterExchangeRates,
  useExchangeRateColumns,
  useExchangeRateSearchSchema,
} from './data';
import Form from './modules/form.vue';

import '../../system/shared/system.css';

const { hasAccessByCodes } = useAccess();
const canManage = hasAccessByCodes(['exchange_rate:manage']);

const [FormModal, formModalApi] = useVbenModal({
  connectedComponent: Form,
  destroyOnClose: true,
});

function onCreate() {
  formModalApi.setData({}).open();
}

function onEdit(row: ExchangeRateApi.ExchangeRate) {
  formModalApi.setData(row).open();
}

function onDelete(row: ExchangeRateApi.ExchangeRate) {
  const label = `${row.fromCurrency}→${row.toCurrency}`;
  const hideLoading = message.loading({
    content: $t('ui.actionMessage.deleting', [label]),
    duration: 0,
    key: 'rate_delete_msg',
  });
  deleteExchangeRate(row.id)
    .then(() => {
      message.success({
        content: $t('ui.actionMessage.deleteSuccess', [label]),
        key: 'rate_delete_msg',
      });
      gridApi.query();
    })
    .catch(() => hideLoading());
}

function onActionClick({
  code,
  row,
}: OnActionClickParams<ExchangeRateApi.ExchangeRate>) {
  if (code === 'edit') {
    onEdit(row);
  }
  if (code === 'delete') {
    onDelete(row);
  }
}

const searchFormOptions = useI18nFormOptions(() => ({
  collapsed: false,
  schema: useExchangeRateSearchSchema(),
  showCollapseButton: false,
  submitOnChange: false,
}));

const [Grid, gridApi] = useVbenVxeGrid({
  formOptions: searchFormOptions.value,
  gridOptions: {
    columns: useExchangeRateColumns(onActionClick, canManage),
    height: 'auto',
    pagerConfig: { enabled: false },
    proxyConfig: {
      ajax: {
        query: async (_ctx, formValues) => {
          const list = await getExchangeRateList();
          const items = filterExchangeRates(list, formValues);
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
  } as VxeTableGridOptions<ExchangeRateApi.ExchangeRate>,
});
</script>

<template>
  <Page
    auto-content-height
    :description="$t('page.masterData.hint.exchangeRate')"
  >
    <FormModal @success="gridApi.query()" />
    <Grid class="system-grid" :form-options="searchFormOptions">
      <template #toolbar-tools>
        <Button v-if="canManage" type="primary" @click="onCreate">
          <Plus class="size-4" />
          {{ $t('page.masterData.actions.createExchangeRate') }}
        </Button>
      </template>
      <template #fromCurrency="{ row }">
        <span class="sys-code">{{ row.fromCurrency }}</span>
      </template>
      <template #toCurrency="{ row }">
        <span class="sys-code">{{ row.toCurrency }}</span>
      </template>
    </Grid>
  </Page>
</template>
