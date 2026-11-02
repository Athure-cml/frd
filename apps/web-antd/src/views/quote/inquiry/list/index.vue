<script lang="ts" setup>
import type {
  OnActionClickParams,
  VxeTableGridOptions,
} from '#/adapter/vxe-table';
import type { InquiryApi } from '#/api/quote/inquiry';

import { onActivated, ref } from 'vue';
import { useRouter } from 'vue-router';

import { useAccess } from '@vben/access';
import { Page } from '@vben/common-ui';
import { Plus } from '@vben/icons';

import { Button, message, Modal, Tag } from 'ant-design-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { deleteInquiry, getInquiryList } from '#/api/quote/inquiry';
import { $t } from '#/locales';

import {
  scheduleGridRecalculate,
  useGridResizeRecalculate,
} from '../../../cost-library/shared/schedule-grid-recalculate';
import { useI18nFormOptions } from '../../../shared/use-i18n-form-options';
import {
  consumeQuoteListForceRefresh,
  hasActiveListFilters,
} from '../../shared/list-cache';
import {
  resolveInquiryStatusTag,
  useInquiryColumns,
  useInquirySearchSchema,
} from './data';

import '../../shared/quote.css';

defineOptions({ name: 'InquiryList' });

const router = useRouter();
const { hasAccessByCodes } = useAccess();
const canCreate = hasAccessByCodes(['inquiry:create']);
const canDelete = hasAccessByCodes(['inquiry:delete']);
/** 最近一次列表请求的页码（用于 keepAlive 返回时判断是否需刷新） */
const lastQueryPage = ref(1);

async function onCreate() {
  await router.push({ name: 'InquiryCreate' });
}

function onView(row: InquiryApi.ListItem) {
  router.push({ name: 'InquiryEdit', params: { id: row.id } });
}

function onDelete(row: InquiryApi.ListItem) {
  if (row.status !== 'PENDING_SUBMIT') {
    return;
  }
  Modal.confirm({
    centered: true,
    content: $t('page.inquiry.confirm.delete', [row.inquiryNo]),
    okType: 'danger',
    title: $t('common.delete'),
    onOk: async () => {
      await deleteInquiry(row.id);
      message.success($t('page.inquiry.message.deleteSuccess'));
      await gridApi.query();
    },
  });
}

function onActionClick({
  code,
  row,
}: OnActionClickParams<InquiryApi.ListItem>) {
  if (code === 'view') {
    onView(row);
    return;
  }
  if (code === 'delete') {
    onDelete(row);
  }
}

const searchFormOptions = useI18nFormOptions(() => ({
  collapsed: true,
  schema: useInquirySearchSchema(),
  showCollapseButton: true,
  submitOnChange: false,
}));

const [Grid, gridApi] = useVbenVxeGrid({
  formOptions: searchFormOptions.value,
  gridEvents: {
    dataRendered: () => {
      scheduleGridRecalculate(
        () =>
          gridApi.grid as null | {
            recalculate?: (refull?: boolean) => void;
          },
      );
    },
  },
  gridOptions: {
    id: 'inquiry-list',
    columns: useInquiryColumns(onActionClick, canDelete),
    height: '100%',
    pagerConfig: {},
    proxyConfig: {
      ajax: {
        query: async ({ page }, formValues) => {
          lastQueryPage.value = page.currentPage || 1;
          return await getInquiryList({
            page: page.currentPage,
            pageSize: page.pageSize,
            ...formValues,
          });
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
  } as VxeTableGridOptions<InquiryApi.ListItem>,
});

const gridHostRef = ref<HTMLElement | null>(null);
useGridResizeRecalculate(
  gridHostRef,
  () =>
    gridApi.grid as null | {
      recalculate?: (refull?: boolean) => void;
    },
);

/**
 * keepAlive 返回策略：
 * 1) 详情侧有写操作 → 强制按当前条件刷新
 * 2) 有搜索条件或非第 1 页 → 保留缓存，不请求
 * 3) 默认空条件第 1 页 → 刷新，避免漏掉新单据
 */
onActivated(async () => {
  scheduleGridRecalculate(
    () =>
      gridApi.grid as null | {
        recalculate?: (refull?: boolean) => void;
      },
  );

  const forceRefresh = consumeQuoteListForceRefresh('inquiry');
  if (forceRefresh) {
    await gridApi.query();
    return;
  }

  const formValues =
    (await gridApi.formApi?.getLatestSubmissionValues?.()) ?? {};
  const keepCache = hasActiveListFilters(formValues) || lastQueryPage.value > 1;
  if (!keepCache) {
    await gridApi.query();
  }
});
</script>

<template>
  <Page
    auto-content-height
    :description="$t('page.inquiry.hint.list')"
    :title="$t('page.inquiry.list')"
  >
    <div ref="gridHostRef" class="cost-library-grid-host h-full min-h-0">
      <Grid class="quote-grid" :form-options="searchFormOptions">
        <template #toolbar-tools>
          <Button v-if="canCreate" type="primary" @click="onCreate">
            <Plus class="size-4" />
            {{ $t('page.inquiry.actions.create') }}
          </Button>
        </template>
        <template #inquiryNo="{ row }">
          <button class="quote-no-link" type="button" @click="onView(row)">
            {{ row.inquiryNo }}
          </button>
        </template>
        <template #status="{ row }">
          <Tag
            :class="resolveInquiryStatusTag(row.status).className"
            :color="resolveInquiryStatusTag(row.status).color"
          >
            {{ resolveInquiryStatusTag(row.status).label }}
          </Tag>
        </template>
      </Grid>
    </div>
  </Page>
</template>
