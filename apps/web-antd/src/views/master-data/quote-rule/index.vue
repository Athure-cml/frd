<script lang="ts" setup>
import type {
  OnActionClickParams,
  VxeTableGridOptions,
} from '#/adapter/vxe-table';
import type { QuoteRuleApi } from '#/api/quote-rule';

import { useAccess } from '@vben/access';
import { Page, useVbenModal } from '@vben/common-ui';
import { Plus } from '@vben/icons';

import { Button, message } from 'ant-design-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  batchDeleteQuoteRule,
  deleteQuoteRule,
  getQuoteRuleList,
} from '#/api/quote-rule';
import { $t } from '#/locales';

import { useI18nFormOptions } from '../../shared/use-i18n-form-options';
import {
  masterDataCheckboxConfig,
  useMasterDataBatchDelete,
} from '../shared/use-batch-delete';
import {
  filterQuoteRules,
  useQuoteRuleColumns,
  useQuoteRuleSearchSchema,
} from './data';
import Form from './modules/form.vue';

import '../../system/shared/system.css';

const { hasAccessByCodes } = useAccess();
const canManage = hasAccessByCodes(['md_quote_rule:manage']);

const [FormModal, formModalApi] = useVbenModal({
  connectedComponent: Form,
  destroyOnClose: true,
});

function onCreate() {
  formModalApi.setData({}).open();
}

function onEdit(row: QuoteRuleApi.QuoteRule) {
  formModalApi.setData(row).open();
}

function onDelete(row: QuoteRuleApi.QuoteRule) {
  const hideLoading = message.loading({
    content: $t('ui.actionMessage.deleting', [row.name]),
    duration: 0,
    key: 'quote_rule_delete_msg',
  });
  deleteQuoteRule(row.id)
    .then(() => {
      message.success({
        content: $t('ui.actionMessage.deleteSuccess', [row.name]),
        key: 'quote_rule_delete_msg',
      });
      gridApi.query();
    })
    .catch(() => hideLoading());
}

function onActionClick({
  code,
  row,
}: OnActionClickParams<QuoteRuleApi.QuoteRule>) {
  if (code === 'edit') {
    onEdit(row);
  }
  if (code === 'delete') {
    onDelete(row);
  }
}

const searchFormOptions = useI18nFormOptions(() => ({
  collapsed: true,
  schema: useQuoteRuleSearchSchema(),
  showCollapseButton: true,
  submitOnChange: false,
}));

const [Grid, gridApi] = useVbenVxeGrid({
  formOptions: searchFormOptions.value,
  gridOptions: {
    id: 'md-quote-rule-list',
    checkboxConfig: masterDataCheckboxConfig,
    columns: useQuoteRuleColumns(onActionClick, canManage),
    height: 'auto',
    pagerConfig: { enabled: false },
    proxyConfig: {
      ajax: {
        query: async (_ctx, formValues) => {
          const list = await getQuoteRuleList();
          const items = filterQuoteRules(list, formValues);
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
  } as VxeTableGridOptions<QuoteRuleApi.QuoteRule>,
});

const { onBatchDelete } = useMasterDataBatchDelete({
  batchDelete: batchDeleteQuoteRule,
  gridApi,
});
</script>

<template>
  <Page auto-content-height :description="$t('page.masterData.hint.quoteRule')">
    <FormModal @success="gridApi.query()" />
    <Grid class="system-grid" :form-options="searchFormOptions">
      <template #toolbar-tools>
        <Button v-if="canManage" class="mr-2" type="primary" @click="onCreate">
          <Plus class="size-4" />
          {{ $t('page.masterData.actions.createQuoteRule') }}
        </Button>
        <Button v-if="canManage" class="mr-2" danger @click="onBatchDelete">
          {{ $t('page.masterData.actions.batchDelete') }}
        </Button>
      </template>
    </Grid>
  </Page>
</template>
