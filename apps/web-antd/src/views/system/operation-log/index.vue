<script lang="ts" setup>
import type { VxeTableGridOptions } from '#/adapter/vxe-table';
import type { OperationLogApi } from '#/api/system/operation-log';

import { Page, useVbenDrawer } from '@vben/common-ui';

import { Button, Tag } from 'ant-design-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { getOperationLogList } from '#/api/system/operation-log';
import { $t } from '#/locales';

import { useI18nFormOptions } from '../../shared/use-i18n-form-options';
import {
  getOperationLogActionLabel,
  getOperationLogModuleLabel,
  useOperationLogColumns,
  useOperationLogSearchSchema,
} from './data';
import Detail from './modules/detail.vue';

import '../shared/system.css';

const [DetailDrawer, detailDrawerApi] = useVbenDrawer({
  connectedComponent: Detail,
  class: 'w-full sm:w-[640px]',
  destroyOnClose: true,
});

function onViewDetail(row: OperationLogApi.OperationLog) {
  detailDrawerApi.setData(row).open();
}

const searchFormOptions = useI18nFormOptions(() => ({
  collapsed: false,
  schema: useOperationLogSearchSchema(),
  showCollapseButton: true,
  submitOnChange: false,
}));

const [Grid] = useVbenVxeGrid({
  formOptions: searchFormOptions.value,
  gridOptions: {
    columns: useOperationLogColumns(),
    height: 'auto',
    pagerConfig: {},
    proxyConfig: {
      ajax: {
        query: async ({ page }, formValues) => {
          return await getOperationLogList({
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
  } as VxeTableGridOptions<OperationLogApi.OperationLog>,
});
</script>

<template>
  <Page auto-content-height :description="$t('page.system.hint.operationLog')">
    <DetailDrawer />
    <Grid class="system-grid" :form-options="searchFormOptions">
      <template #username="{ row }">
        <span class="sys-code">{{ row.username || '—' }}</span>
      </template>
      <template #module="{ row }">
        {{ getOperationLogModuleLabel(row.module) }}
      </template>
      <template #action="{ row }">
        <Tag class="m-0" color="processing">
          {{ getOperationLogActionLabel(row.action) }}
        </Tag>
      </template>
      <template #success="{ row }">
        <Tag class="m-0" :color="row.success ? 'success' : 'error'">
          {{
            row.success
              ? $t('page.system.operationLogPage.status.success')
              : $t('page.system.operationLogPage.status.failed')
          }}
        </Tag>
      </template>
      <template #operation="{ row }">
        <Button size="small" type="link" @click="onViewDetail(row)">
          {{ $t('page.system.operationLogPage.actions.detail') }}
        </Button>
      </template>
    </Grid>
  </Page>
</template>
