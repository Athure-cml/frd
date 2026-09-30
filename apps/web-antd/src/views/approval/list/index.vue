<script lang="ts" setup>
import type {
  OnActionClickParams,
  VxeTableGridOptions,
} from '#/adapter/vxe-table';
import type { ApprovalApi } from '#/api/approval';

import { useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';

import { Tag } from 'ant-design-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { getQuoteApprovalList } from '#/api/approval';
import { $t } from '#/locales';

import {
  resolveApprovalStatusTag,
  useApprovalColumns,
  useApprovalSearchSchema,
} from '../shared/data';

import '../../quote/shared/quote.css';

const router = useRouter();

function onView(row: ApprovalApi.ListItem) {
  router.push({
    name: 'ApprovalDetail',
    params: { id: row.id },
    query: row.cycleIndex ? { cycle: String(row.cycleIndex) } : {},
  });
}

function onActionClick({
  code,
  row,
}: OnActionClickParams<ApprovalApi.ListItem>) {
  if (code === 'view') {
    onView(row);
  }
}

const [Grid] = useVbenVxeGrid({
  formOptions: {
    schema: useApprovalSearchSchema(),
    submitOnChange: true,
  },
  gridOptions: {
    id: 'approval-list',
    columns: useApprovalColumns(onActionClick),
    customConfig: {
      storage: false,
    },
    height: 'auto',
    keepSource: true,
    scrollX: {
      enabled: true,
    },
    proxyConfig: {
      ajax: {
        query: async ({ page }, formValues) => {
          const result = await getQuoteApprovalList({
            ...formValues,
            page: page.currentPage,
            pageSize: page.pageSize,
          });
          return {
            items: result.items,
            total: result.total,
          };
        },
      },
    },
    rowConfig: {
      isHover: true,
      keyField: 'rowKey',
    },
    toolbarConfig: {
      refresh: true,
      search: true,
    },
  } as VxeTableGridOptions<ApprovalApi.ListItem>,
});
</script>

<template>
  <Page :title="$t('page.approval.list')">
    <Grid>
      <template #status="{ row }">
        <Tag :color="resolveApprovalStatusTag(row.status).color">
          {{ resolveApprovalStatusTag(row.status).label }}
        </Tag>
      </template>
    </Grid>
  </Page>
</template>
