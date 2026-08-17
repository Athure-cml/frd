<script lang="ts" setup>
import type {
  OnActionClickParams,
  VxeTableGridOptions,
} from '#/adapter/vxe-table';
import type { ContainerTypeApi } from '#/api/master-data/container-type';

import { useAccess } from '@vben/access';
import { Page, useVbenModal } from '@vben/common-ui';
import { Plus } from '@vben/icons';

import { Button, message } from 'ant-design-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  deleteContainerType,
  getContainerTypeList,
} from '#/api/master-data/container-type';
import { $t } from '#/locales';

import { useI18nFormOptions } from '../../shared/use-i18n-form-options';
import { useContainerTypeColumns, useContainerTypeSearchSchema } from './data';
import Form from './modules/form.vue';

import '../../system/shared/system.css';

const { hasAccessByCodes } = useAccess();
const canManage = hasAccessByCodes(['md_container_type:manage']);

const [FormModal, formModalApi] = useVbenModal({
  connectedComponent: Form,
  destroyOnClose: true,
});

function onCreate() {
  formModalApi.setData({}).open();
}

function onEdit(row: ContainerTypeApi.ContainerType) {
  formModalApi.setData(row).open();
}

function onDelete(row: ContainerTypeApi.ContainerType) {
  const hideLoading = message.loading({
    content: $t('ui.actionMessage.deleting', [row.name]),
    duration: 0,
    key: 'container_type_delete_msg',
  });
  deleteContainerType(row.id)
    .then(() => {
      message.success({
        content: $t('ui.actionMessage.deleteSuccess', [row.name]),
        key: 'container_type_delete_msg',
      });
      gridApi.query();
    })
    .catch(() => hideLoading());
}

function onActionClick({
  code,
  row,
}: OnActionClickParams<ContainerTypeApi.ContainerType>) {
  if (code === 'edit') {
    onEdit(row);
  }
  if (code === 'delete') {
    onDelete(row);
  }
}

const searchFormOptions = useI18nFormOptions(() => ({
  collapsed: true,
  schema: useContainerTypeSearchSchema(),
  showCollapseButton: true,
  submitOnChange: false,
}));

const [Grid, gridApi] = useVbenVxeGrid({
  formOptions: searchFormOptions.value,
  gridOptions: {
    id: 'md-container-type-list',
    columns: useContainerTypeColumns(onActionClick, canManage),
    height: 'auto',
    pagerConfig: { enabled: false },
    proxyConfig: {
      ajax: {
        query: async (_ctx, formValues) => {
          const items = await getContainerTypeList({
            code: formValues?.code,
            name: formValues?.name,
          });
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
  } as VxeTableGridOptions<ContainerTypeApi.ContainerType>,
});
</script>

<template>
  <Page
    auto-content-height
    :description="$t('page.masterData.hint.containerType')"
  >
    <FormModal @success="gridApi.query()" />
    <Grid class="system-grid" :form-options="searchFormOptions">
      <template #toolbar-tools>
        <Button v-if="canManage" type="primary" @click="onCreate">
          <Plus class="size-4" />
          {{ $t('page.masterData.actions.createContainerType') }}
        </Button>
      </template>
      <template #code="{ row }">
        <span class="sys-code">{{ row.code }}</span>
      </template>
    </Grid>
  </Page>
</template>
