<script lang="ts" setup>
import type {
  OnActionClickParams,
  VxeTableGridOptions,
} from '#/adapter/vxe-table';
import type { QuoteApi } from '#/api/quote';

import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { useAccess } from '@vben/access';
import { Page } from '@vben/common-ui';
import { Download, Plus } from '@vben/icons';
import { downloadFileFromBlob } from '@vben/utils';

import { Button, message, Modal, Tag } from 'ant-design-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  deleteQuote,
  exportQuotes,
  getQuoteList,
  voidQuote,
} from '#/api/quote';
import { $t } from '#/locales';

import {
  buildListExportParams,
  getGridSelectedIds,
} from '../../shared/export-params';
import { useI18nFormOptions } from '../../shared/use-i18n-form-options';
import {
  quoteRowClassName,
  resolveQuoteListStatusTag,
  useQuoteColumns,
  useQuoteSearchSchema,
} from './data';

import '../shared/quote.css';

const router = useRouter();
const route = useRoute();
const { hasAccessByCodes } = useAccess();
const canCreate = hasAccessByCodes(['quote:create']);
const canDelete = hasAccessByCodes(['quote:delete']);
const canVoid = hasAccessByCodes(['quote:approve']);
const canExport = hasAccessByCodes(['quote:export']);
const exporting = ref(false);

/** 报价库反查：/quotes/list?libraryMode=road&libraryCostId=123 */
const libraryFilter = computed(() => {
  const modeRaw = route.query.libraryMode;
  const idRaw = route.query.libraryCostId;
  const libraryMode =
    typeof modeRaw === 'string' &&
    (modeRaw === 'road' || modeRaw === 'sea' || modeRaw === 'fumigation')
      ? modeRaw
      : '';
  const libraryCostId =
    typeof idRaw === 'string' && /^\d+$/.test(idRaw) ? Number(idRaw) : 0;
  if (!libraryMode || libraryCostId <= 0) {
    return null;
  }
  return { libraryCostId, libraryMode };
});

const libraryFilterHint = computed(() => {
  const filter = libraryFilter.value;
  if (!filter) {
    return '';
  }
  const modeLabel = $t(`page.quote.library.${filter.libraryMode}`);
  return $t('page.quote.libraryFilterHint', [modeLabel, filter.libraryCostId]);
});

function clearLibraryFilter() {
  const nextQuery = { ...route.query };
  delete nextQuery.libraryMode;
  delete nextQuery.libraryCostId;
  router.replace({ query: nextQuery }).then(() => {
    void gridApi.query();
  });
}

function canOperateRow(row: QuoteApi.QuoteListItem) {
  return row.operable === true;
}

async function onCreate() {
  await router.push({ name: 'QuoteCreate' });
}

function onView(row: QuoteApi.QuoteListItem) {
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
  if (code === 'void') {
    onVoid(row);
    return;
  }
  if (code === 'delete') {
    onDelete(row);
  }
}

async function onBatchExport() {
  exporting.value = true;
  const hideLoading = message.loading({
    content: $t('page.quote.message.exporting'),
    duration: 0,
    key: 'quote_export_msg',
  });
  try {
    const formValues = await gridApi.formApi?.getLatestSubmissionValues?.();
    const blob = await exportQuotes(
      buildListExportParams(formValues, getGridSelectedIds(gridApi)),
    );
    await downloadFileFromBlob({
      fileName: `报价单-${Date.now()}.xlsx`,
      source: blob as Blob,
    });
    message.success({
      content: $t('page.quote.message.exportSuccess'),
      key: 'quote_export_msg',
    });
  } catch {
    hideLoading();
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
    id: 'quote-list',
    columns: useQuoteColumns(onActionClick, canDelete, canVoid, canOperateRow),
    height: 'auto',
    pagerConfig: {},
    proxyConfig: {
      ajax: {
        query: async ({ page }, formValues) => {
          const filter = libraryFilter.value;
          return await getQuoteList({
            page: page.currentPage,
            pageSize: page.pageSize,
            ...formValues,
            ...(filter
              ? {
                  libraryCostId: filter.libraryCostId,
                  libraryMode: filter.libraryMode,
                }
              : {}),
          });
        },
      },
    },
    rowClassName: quoteRowClassName,
    rowConfig: {
      keyField: 'id',
    },
    checkboxConfig: {
      highlight: true,
      reserve: true,
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

watch(
  () => [route.query.libraryMode, route.query.libraryCostId],
  () => {
    void gridApi.query();
  },
);
</script>

<template>
  <Page
    auto-content-height
    :description="$t('page.quote.hint.list')"
    :title="$t('page.quote.list')"
  >
    <div v-if="libraryFilter" class="quote-library-filter-banner">
      <span>{{ libraryFilterHint }}</span>
      <Button size="small" type="link" @click="clearLibraryFilter">
        {{ $t('page.quote.clearLibraryFilter') }}
      </Button>
    </div>
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
      <template #status="{ row }">
        <Tag
          :class="resolveQuoteListStatusTag(row).className"
          :color="resolveQuoteListStatusTag(row).color"
        >
          {{ resolveQuoteListStatusTag(row).label }}
        </Tag>
      </template>
    </Grid>
  </Page>
</template>
