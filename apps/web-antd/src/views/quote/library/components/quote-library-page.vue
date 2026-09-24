<script lang="ts" setup>
import type { QuoteLibraryMode } from '../shared/quote-library-columns';

import type {
  OnActionClickParams,
  VxeTableGridOptions,
} from '#/adapter/vxe-table';
import type { QuoteApi } from '#/api/quote';

import { useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { getQuoteList } from '#/api/quote';
import { $t } from '#/locales';

import { useI18nFormOptions } from '../../../shared/use-i18n-form-options';
import { quoteRowClassName, useQuoteSearchSchema } from '../../list/data';
import { useQuoteLibraryColumns } from '../shared/quote-library-columns';

import '../../shared/quote.css';

const props = defineProps<{
  descriptionKey: string;
  mode: QuoteLibraryMode;
  titleKey: string;
}>();

const router = useRouter();

function onView(row: QuoteApi.QuoteListItem) {
  router.push({ name: 'QuoteEdit', params: { id: row.id } });
}

function onActionClick({
  code,
  row,
}: OnActionClickParams<QuoteApi.QuoteListItem>) {
  if (code === 'view') {
    onView(row);
  }
}

const searchFormOptions = useI18nFormOptions(() => ({
  collapsed: true,
  schema: useQuoteSearchSchema(),
  showCollapseButton: true,
  submitOnChange: false,
}));

const [Grid] = useVbenVxeGrid({
  formOptions: searchFormOptions.value,
  gridOptions: {
    id: `quote-library-${props.mode}`,
    columns: useQuoteLibraryColumns(props.mode, onActionClick),
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
    :description="$t(descriptionKey)"
    :title="$t(titleKey)"
  >
    <Grid class="quote-grid" :form-options="searchFormOptions">
      <template #quoteNo="{ row }">
        <button class="quote-no-link" type="button" @click="onView(row)">
          {{ row.quoteNo }}
        </button>
      </template>
    </Grid>
  </Page>
</template>
