<script lang="ts" setup>
import type {
  OnActionClickParams,
  VxeTableGridOptions,
} from '#/adapter/vxe-table';
import type { SystemDeptApi } from '#/api/system/dept';

import { useAccess } from '@vben/access';
import { Page, useVbenModal } from '@vben/common-ui';
import { Plus } from '@vben/icons';

import { Button, message } from 'ant-design-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { deleteDepartment, getDepartmentList } from '#/api/system/dept';
import { $t } from '#/locales';

import { useI18nFormOptions } from '../../shared/use-i18n-form-options';
import { filterDepartments, useDeptColumns, useDeptSearchSchema } from './data';
import Form from './modules/form.vue';

import '../shared/system.css';

const { hasAccessByCodes } = useAccess();
const canManage = hasAccessByCodes(['sys:dept:manage']);

const [FormModal, formModalApi] = useVbenModal({
  connectedComponent: Form,
  destroyOnClose: true,
});

function onCreate() {
  formModalApi.setData({}).open();
}

function onEdit(row: SystemDeptApi.Department) {
  formModalApi.setData(row).open();
}

function onDelete(row: SystemDeptApi.Department) {
  const hideLoading = message.loading({
    content: $t('ui.actionMessage.deleting', [row.name]),
    duration: 0,
    key: 'action_process_msg',
  });
  deleteDepartment(row.id)
    .then(() => {
      message.success({
        content: $t('ui.actionMessage.deleteSuccess', [row.name]),
        key: 'action_process_msg',
      });
      gridApi.query();
    })
    .catch(() => hideLoading());
}

function onActionClick({
  code,
  row,
}: OnActionClickParams<SystemDeptApi.Department>) {
  if (code === 'edit') {
    onEdit(row);
  }
  if (code === 'delete') {
    onDelete(row);
  }
}

const searchFormOptions = useI18nFormOptions(() => ({
  collapsed: false,
  schema: useDeptSearchSchema(),
  showCollapseButton: false,
  submitOnChange: false,
}));

const [Grid, gridApi] = useVbenVxeGrid({
  formOptions: searchFormOptions.value,
  gridOptions: {
    columns: useDeptColumns(onActionClick, canManage),
    height: 'auto',
    pagerConfig: {
      enabled: false,
    },
    proxyConfig: {
      ajax: {
        query: async (_ctx, formValues) => {
          const list = await getDepartmentList();
          const items = filterDepartments(list, formValues);
          return { items, total: items.length };
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
  } as VxeTableGridOptions,
});

function onRefresh() {
  gridApi.query();
}
</script>

<template>
  <Page auto-content-height :description="$t('page.system.hint.dept')">
    <FormModal @success="onRefresh" />
    <Grid class="system-grid" :form-options="searchFormOptions">
      <template #toolbar-tools>
        <Button v-if="canManage" type="primary" @click="onCreate">
          <Plus class="size-4" />
          {{ $t('page.system.actions.createDept') }}
        </Button>
      </template>
      <template #code="{ row }">
        <span class="sys-code">{{ row.code }}</span>
      </template>
    </Grid>
  </Page>
</template>
