<script lang="ts" setup>
import type {
  OnActionClickParams,
  VxeTableGridOptions,
} from '#/adapter/vxe-table';
import type { SystemRoleApi } from '#/api/system/role';

import { onMounted, ref, shallowRef } from 'vue';

import { useAccess } from '@vben/access';
import { Page, useVbenDrawer } from '@vben/common-ui';
import { Plus } from '@vben/icons';

import { Button, Checkbox, message, Modal, Popover, Tag } from 'ant-design-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { getPermissionList } from '#/api/system/permission';
import { deleteRole, getRoleList, updateRole } from '#/api/system/role';
import { $t } from '#/locales';
import { useInternalCodeVisibility } from '#/utils/internal-code-access';

import { useI18nFormOptions } from '../../shared/use-i18n-form-options';
import {
  buildPermissionNameMap,
  formatPermissionLabel,
} from '../shared/permission-labels';
import { canManageBuiltinRoleRow } from '../shared/role-access';
import {
  filterRoles,
  rowToRoleFormValues,
  toRoleSavePayload,
  useRoleColumns,
  useRoleSearchSchema,
} from './data';
import Form from './modules/form.vue';

import '../shared/system.css';

const { hasAccessByCodes } = useAccess();
const { canViewInternalCodes } = useInternalCodeVisibility();
const canManage = hasAccessByCodes(['sys:role:manage']);

const permissionNameMap = shallowRef(new Map<string, string>());
const showPermissionCodes = ref(false);

function resolvePermissionLabel(code: string) {
  return formatPermissionLabel(
    code,
    permissionNameMap.value,
    canViewInternalCodes.value && showPermissionCodes.value,
  );
}

onMounted(async () => {
  try {
    const list = await getPermissionList();
    permissionNameMap.value = buildPermissionNameMap(list);
  } catch {
    permissionNameMap.value = new Map();
  }
});

const [FormDrawer, formDrawerApi] = useVbenDrawer({
  connectedComponent: Form,
  class: 'w-full sm:w-[560px]',
  destroyOnClose: true,
});

function onCreate() {
  formDrawerApi.setData(undefined).open();
}

function onEdit(row: SystemRoleApi.SystemRole) {
  formDrawerApi.setData(row).open();
}

function onDelete(row: SystemRoleApi.SystemRole) {
  const hideLoading = message.loading({
    content: $t('ui.actionMessage.deleting', [row.name]),
    duration: 0,
    key: 'action_process_msg',
  });
  deleteRole(row.id)
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
}: OnActionClickParams<SystemRoleApi.SystemRole>) {
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
  row: SystemRoleApi.SystemRole,
) {
  if (!canManageBuiltinRoleRow(row.code, canViewInternalCodes.value)) {
    return false;
  }
  const label =
    newStatus === 1
      ? $t('page.system.status.enabled')
      : $t('page.system.status.disabled');
  try {
    await confirm(
      $t('page.system.confirm.statusChange', [row.name, label]),
      $t('common.prompt'),
    );
    const values = rowToRoleFormValues(row);
    await updateRole(
      row.id,
      toRoleSavePayload({ ...values, status: newStatus }),
    );
    message.success($t('ui.actionMessage.operationSuccess'));
    return true;
  } catch {
    return false;
  }
}

function buildColumns() {
  return useRoleColumns(
    onActionClick,
    onStatusChange,
    canManage,
    canViewInternalCodes.value,
  );
}

const searchFormOptions = useI18nFormOptions(() => ({
  collapsed: false,
  schema: useRoleSearchSchema(),
  showCollapseButton: false,
  submitOnChange: false,
}));

const [Grid, gridApi] = useVbenVxeGrid({
  formOptions: searchFormOptions.value,
  gridOptions: {
    columns: buildColumns(),
    height: 'auto',
    pagerConfig: {
      enabled: false,
    },
    proxyConfig: {
      ajax: {
        query: async (_ctx, formValues) => {
          const list = await getRoleList();
          const items = filterRoles(list, formValues);
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
  } as VxeTableGridOptions<SystemRoleApi.SystemRole>,
});

function onRefresh() {
  gridApi.query();
}
</script>

<template>
  <Page auto-content-height :description="$t('page.system.hint.role')">
    <FormDrawer @success="onRefresh" />
    <Grid class="system-grid" :form-options="searchFormOptions">
      <template #toolbar-tools>
        <Button v-if="canManage" type="primary" @click="onCreate">
          <Plus class="size-4" />
          {{ $t('page.system.actions.createRole') }}
        </Button>
      </template>
      <template #code="{ row }">
        <span class="sys-code">{{ row.code }}</span>
      </template>
      <template #permissions="{ row }">
        <template v-if="row.permissions?.length">
          <Popover
            placement="leftTop"
            trigger="click"
            :overlay-style="{ maxWidth: '420px' }"
          >
            <Tag class="sys-perm-trigger m-0 cursor-pointer" color="default">
              {{ $t('page.system.permissionCount', [row.permissions.length]) }}
            </Tag>
            <template #content>
              <div class="mb-2 flex items-center justify-between gap-3">
                <p class="mb-0 text-sm font-medium">
                  {{ $t('page.system.fields.permissions') }}
                </p>
                <Checkbox
                  v-if="canViewInternalCodes"
                  v-model:checked="showPermissionCodes"
                  class="shrink-0 text-xs whitespace-nowrap"
                >
                  {{ $t('page.system.permissionShowCodes') }}
                </Checkbox>
              </div>
              <div class="flex max-h-64 flex-wrap gap-1 overflow-y-auto">
                <Tag
                  v-for="code in row.permissions"
                  :key="code"
                  class="m-0 max-w-full"
                  :title="resolvePermissionLabel(code)"
                >
                  {{ resolvePermissionLabel(code) }}
                </Tag>
              </div>
            </template>
          </Popover>
        </template>
        <span v-else class="text-muted-foreground">—</span>
      </template>
    </Grid>
  </Page>
</template>
