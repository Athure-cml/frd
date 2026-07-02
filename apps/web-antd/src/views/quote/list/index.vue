<script lang="ts" setup>
import type {
  OnActionClickParams,
  VxeTableGridOptions,
} from '#/adapter/vxe-table';
import type { QuoteApi } from '#/api/quote';

import { ref } from 'vue';
import { useRouter } from 'vue-router';

import { useAccess } from '@vben/access';
import { Page } from '@vben/common-ui';
import { Download, Plus } from '@vben/icons';

import { Button, message, Modal } from 'ant-design-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  deleteQuote,
  exportQuotes,
  getQuoteList,
  voidQuote,
} from '#/api/quote';
import { $t } from '#/locales';

import { useI18nFormOptions } from '../../shared/use-i18n-form-options';
import {
  quoteRowClassName,
  useQuoteColumns,
  useQuoteSearchSchema,
} from './data';

import '../shared/quote.css';

const router = useRouter();
const { hasAccessByCodes } = useAccess();
const canCreate = hasAccessByCodes(['quote:create']);
const canEdit = hasAccessByCodes(['quote:edit']);
const canDelete = hasAccessByCodes(['quote:delete']);
const canVoid = hasAccessByCodes(['quote:approve']);
const canExport = hasAccessByCodes(['quote:export']);
const exporting = ref(false);

function onCreate() {
  router.push({ name: 'QuoteCreate' });
}

function onView(row: QuoteApi.QuoteListItem) {
  router.push({ name: 'QuoteDetail', params: { id: row.id } });
}

function onEdit(row: QuoteApi.QuoteListItem) {
  router.push({ name: 'QuoteEdit', params: { id: row.id } });
}

function onDelete(row: QuoteApi.QuoteListItem) {
  const hideLoading = message.loading({
    content: $t('ui.actionMessage.deleting', [row.quoteNo]),
    duration: 0,
    key: 'quote_delete_msg',
  });
  deleteQuote(row.id)
    .then(() => {
      message.success({
        content: $t('ui.actionMessage.deleteSuccess', [row.quoteNo]),
        key: 'quote_delete_msg',
      });
      gridApi.query();
    })
    .catch(() => hideLoading());
}

function onVoid(row: QuoteApi.QuoteListItem) {
  Modal.confirm({
    title: $t('page.quote.actions.void'),
    content: $t('page.quote.confirm.void', [row.quoteNo]),
    onOk: async () => {
      await voidQuote(row.id);
      message.success($t('page.quote.message.voidSuccess'));
      gridApi.query();
    },
  });
}

function onActionClick({
  code,
  row,
}: OnActionClickParams<QuoteApi.QuoteListItem>) {
  if (code === 'view') {
    onView(row);
    return;
  }
  if (code === 'edit') {
    onEdit(row);
    return;
  }
  if (code === 'void') {
    onVoid(row);
    return;
  }
  if (code === 'delete') {
    onDelete(row);
  }
}

async function onBatchExport() {
  const records =
    gridApi.grid?.getCheckboxRecords() as QuoteApi.QuoteListItem[];
  if (!records?.length) {
    message.warning($t('page.quote.message.selectExport'));
    return;
  }
  exporting.value = true;
  try {
    const blob = await exportQuotes(records.map((r) => r.id));
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `quotes-export-${Date.now()}.xlsx`;
    link.click();
    URL.revokeObjectURL(url);
    message.success($t('page.quote.message.exportSuccess'));
  } finally {
    exporting.value = false;
  }
}

const searchFormOptions = useI18nFormOptions(() => ({
  collapsed: true,
  schema: useQuoteSearchSchema(),
  showCollapseButton: true,
  submitOnChange: false,
}));

const [Grid, gridApi] = useVbenVxeGrid({
  formOptions: searchFormOptions.value,
  gridOptions: {
    columns: useQuoteColumns(onActionClick, canEdit, canDelete, canVoid),
    height: 'auto',
    pagerConfig: {},
    proxyConfig: {
      ajax: {
        query: async ({ page }, formValues) => {
          return await getQuoteList({
            page: page.currentPage,
            pageSize: page.pageSize,
            ...formValues,
          });
        },
      },
    },
    rowClassName: quoteRowClassName,
    rowConfig: {
      keyField: 'id',
    },
    scrollX: { enabled: true },
    toolbarConfig: {
      custom: true,
      refresh: true,
      search: true,
      zoom: true,
    },
  } as VxeTableGridOptions<QuoteApi.QuoteListItem>,
});
</script>

<template>
  <Page
    auto-content-height
    :description="$t('page.quote.hint.list')"
    :title="$t('page.quote.list')"
  >
    <Grid class="quote-grid" :form-options="searchFormOptions">
      <template #toolbar-tools>
        <Button
          v-if="canExport"
          class="mr-2"
          :loading="exporting"
          @click="onBatchExport"
        >
          <Download class="size-4" />
          {{ $t('page.quote.actions.export') }}
        </Button>
        <Button v-if="canCreate" type="primary" @click="onCreate">
          <Plus class="size-4" />
          {{ $t('page.quote.actions.create') }}
        </Button>
      </template>
      <template #quoteNo="{ row }">
        <button class="quote-no-link" type="button" @click="onView(row)">
          {{ row.quoteNo }}
        </button>
      </template>
    </Grid>
  </Page>
</template>
