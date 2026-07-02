<script lang="ts" setup>
import type {
  OnActionClickParams,
  VxeTableGridOptions,
} from '#/adapter/vxe-table';
import type { SystemUserApi } from '#/api/system/user';

import { useAccess } from '@vben/access';
import { Page, useVbenDrawer } from '@vben/common-ui';
import { Plus } from '@vben/icons';

import { Button, message, Modal, Tag } from 'ant-design-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { deleteUser, getUserList, updateUser } from '#/api/system/user';
import { $t } from '#/locales';

import { useI18nFormOptions } from '../../shared/use-i18n-form-options';
import {
  rowToUserFormValues,
  toUserUpdatePayload,
  useUserColumns,
  useUserSearchSchema,
} from './data';
import Form from './modules/form.vue';

import '../shared/system.css';

const { hasAccessByCodes } = useAccess();
const canManage = hasAccessByCodes(['sys:user:manage']);

const [FormDrawer, formDrawerApi] = useVbenDrawer({
  connectedComponent: Form,
  class: 'w-full sm:w-[520px]',
  destroyOnClose: true,
});

function onCreate() {
  formDrawerApi.setData(undefined).open();
}

function onEdit(row: SystemUserApi.SystemUser) {
  formDrawerApi.setData(row).open();
}

function onDelete(row: SystemUserApi.SystemUser) {
  const hideLoading = message.loading({
    content: $t('ui.actionMessage.deleting', [row.realName]),
    duration: 0,
    key: 'action_process_msg',
  });
  deleteUser(row.id)
    .then(() => {
      message.success({
        content: $t('ui.actionMessage.deleteSuccess', [row.realName]),
        key: 'action_process_msg',
      });
      gridApi.query();
    })
    .catch(() => hideLoading());
}

function onActionClick({
  code,
  row,
}: OnActionClickParams<SystemUserApi.SystemUser>) {
  if (code === 'edit') {
    onEdit(row);
  }
  if (code === 'delete') {
    onDelete(row);
  }
}

function confirm(content: string, title: string) {
  return new Promise<boolean>((resolve, reject) => {
    Modal.confirm({
      content,
      onCancel: () => reject(new Error('cancelled')),
      onOk: () => resolve(true),
      title,
    });
  });
}

async function onStatusChange(
  newStatus: number,
  row: SystemUserApi.SystemUser,
) {
  const label =
    newStatus === 1
      ? $t('page.system.status.enabled')
      : $t('page.system.status.disabled');
  try {
    await confirm(
      $t('page.system.confirm.statusChange', [row.realName, label]),
      $t('common.prompt'),
    );
    const values = rowToUserFormValues(row);
    await updateUser(
      row.id,
      toUserUpdatePayload({ ...values, status: newStatus }, row),
    );
    message.success($t('ui.actionMessage.operationSuccess'));
    return true;
  } catch {
    return false;
  }
}

const searchFormOptions = useI18nFormOptions(() => ({
  collapsed: false,
  schema: useUserSearchSchema(),
  showCollapseButton: true,
  submitOnChange: false,
}));

const [Grid, gridApi] = useVbenVxeGrid({
  formOptions: searchFormOptions.value,
  gridOptions: {
    columns: useUserColumns(onActionClick, onStatusChange, canManage),
    height: 'auto',
    pagerConfig: {},
    proxyConfig: {
      ajax: {
        query: async ({ page }, formValues) => {
          const { keyword, ...rest } = formValues ?? {};
          return await getUserList({
            page: page.currentPage,
            pageSize: page.pageSize,
            username: keyword,
            ...rest,
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
  } as VxeTableGridOptions<SystemUserApi.SystemUser>,
});

function onRefresh() {
  gridApi.query();
}
</script>

<template>
  <Page auto-content-height :description="$t('page.system.hint.user')">
    <FormDrawer @success="onRefresh" />
    <Grid class="system-grid" :form-options="searchFormOptions">
      <template #toolbar-tools>
        <Button v-if="canManage" type="primary" @click="onCreate">
          <Plus class="size-4" />
          {{ $t('page.system.actions.createUser') }}
        </Button>
      </template>
      <template #username="{ row }">
        <span class="sys-code">{{ row.username }}</span>
      </template>
      <template #roles="{ row }">
        <div
          v-if="row.roleNames?.length"
          class="flex flex-wrap justify-start gap-1 py-0.5"
        >
          <Tag
            v-for="name in row.roleNames"
            :key="name"
            class="m-0"
            color="processing"
          >
            {{ name }}
          </Tag>
        </div>
        <span v-else class="text-muted-foreground">—</span>
      </template>
    </Grid>
  </Page>
</template>
