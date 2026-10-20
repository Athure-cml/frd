import type { VbenFormSchema } from '#/adapter/form';
import type { OnActionClickFn, VxeTableGridOptions } from '#/adapter/vxe-table';
import type { SystemRoleApi } from '#/api/system/role';
import type { SystemUserApi } from '#/api/system/user';

import { getUserList } from '#/api/system/user';
import { $t } from '#/locales';

import { buildOperationColumn, buildStatusColumn } from '../shared/columns';
import {
  canDeleteRoleRow,
  canManageBuiltinRoleRow,
} from '../shared/role-access';
import { dataScopeTagOptions } from '../shared/tags';

const t = (key: string) => $t(`page.system.${key}`);

/** 表单哨兵：本人（运行时由后端并入登录人，不落库） */
const ASSIGNED_SELF_SENTINEL = 0;

/** 指定数据只能勾选当前编辑角色以外的用户 */
function belongsToEditingRole(
  user: SystemUserApi.SystemUser,
  editingRoleCode?: string,
) {
  const code = editingRoleCode?.trim();
  if (!code) {
    return false;
  }
  return (user.roles ?? []).includes(code);
}

/** 本人固定勾选且不可取消 */
function withLockedSelf(ids?: null | number[]) {
  const others = (ids ?? []).filter(
    (id) =>
      id !== null &&
      id !== undefined &&
      id !== ASSIGNED_SELF_SENTINEL &&
      id > 0,
  );
  return [ASSIGNED_SELF_SENTINEL, ...others];
}

function stripLockedSelf(ids?: null | number[]) {
  return (ids ?? []).filter(
    (id) =>
      id !== null &&
      id !== undefined &&
      id !== ASSIGNED_SELF_SENTINEL &&
      id > 0,
  );
}

export function useRoleFormSchema(
  isBuiltin: boolean,
  editingRoleCode?: string,
): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      componentProps: { disabled: isBuiltin, maxlength: 64 },
      fieldName: 'code',
      label: t('fields.code'),
      rules: 'required',
    },
    {
      component: 'Input',
      componentProps: { maxlength: 64 },
      fieldName: 'name',
      label: t('fields.name'),
      rules: 'required',
    },
    {
      component: 'Select',
      componentProps: {
        class: 'w-full',
        dropdownMatchSelectWidth: true,
        options: [
          { label: t('dataScope.ALL'), value: 'ALL' },
          { label: t('dataScope.DEPT'), value: 'DEPT' },
          { label: t('dataScope.ASSIGNED'), value: 'ASSIGNED' },
          { label: t('dataScope.SELF'), value: 'SELF' },
        ],
      },
      fieldName: 'dataScope',
      label: t('fields.dataScope'),
      rules: 'selectRequired',
    },
    {
      component: 'ApiSelect',
      componentProps: (values, formApi) => ({
        allowClear: false,
        api: async () => {
          const result = await getUserList({
            page: 1,
            pageSize: 500,
            status: 1,
          });
          const outsiders = result.items.filter(
            (user) => !belongsToEditingRole(user, editingRoleCode),
          );
          const allowed = new Set(outsiders.map((user) => user.id));
          const current = withLockedSelf(
            Array.isArray(values?.assignedUserIds)
              ? values.assignedUserIds
              : [],
          );
          const cleaned = withLockedSelf(
            current.filter(
              (id) => id === ASSIGNED_SELF_SENTINEL || allowed.has(id),
            ),
          );
          if (cleaned.join(',') !== current.join(',')) {
            formApi?.setFieldValue?.('assignedUserIds', cleaned);
          }
          return [
            {
              disabled: true,
              label: t('dataScope.selfLocked'),
              value: ASSIGNED_SELF_SENTINEL,
            },
            ...outsiders.map((user) => ({
              label: `${user.realName}（${user.username}）`,
              value: user.id,
            })),
          ];
        },
        class: 'w-full',
        mode: 'multiple',
        optionFilterProp: 'label',
        showSearch: true,
        onChange(value: number[]) {
          formApi?.setFieldValue?.(
            'assignedUserIds',
            withLockedSelf(Array.isArray(value) ? value : []),
          );
        },
      }),
      defaultValue: [ASSIGNED_SELF_SENTINEL],
      dependencies: {
        required(values) {
          return values?.dataScope === 'ASSIGNED';
        },
        rules(values) {
          return values?.dataScope === 'ASSIGNED' ? 'selectRequired' : null;
        },
        show(values) {
          return values?.dataScope === 'ASSIGNED';
        },
        trigger(values, _actions, formApi) {
          if (values?.dataScope !== 'ASSIGNED') {
            return;
          }
          formApi?.setFieldValue?.(
            'assignedUserIds',
            withLockedSelf(values.assignedUserIds),
          );
        },
        triggerFields: ['dataScope'],
      },
      fieldName: 'assignedUserIds',
      formItemClass: 'col-span-full',
      label: t('fields.assignedUsers'),
    },
    {
      component: 'RadioGroup',
      componentProps: {
        buttonStyle: 'solid',
        options: [
          { label: t('status.enabled'), value: 1 },
          { label: t('status.disabled'), value: 0 },
        ],
        optionType: 'button',
      },
      defaultValue: 1,
      fieldName: 'status',
      label: t('fields.status'),
    },
    {
      component: 'Textarea',
      componentProps: {
        class: 'w-full',
        maxlength: 255,
        rows: 2,
        showCount: true,
      },
      controlClass: 'w-full max-w-none',
      fieldName: 'remark',
      formItemClass: 'col-span-full sys-remark-field',
      label: t('fields.remark'),
    },
    {
      component: 'Input',
      controlClass: 'w-full max-w-none',
      fieldName: 'permissionCodes',
      formItemClass: 'col-span-full sys-perm-field',
      label: t('fields.permissions'),
      modelPropName: 'value',
    },
  ];
}

export function useRoleSearchSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      fieldName: 'code',
      label: t('fields.code'),
    },
    {
      component: 'Input',
      fieldName: 'name',
      label: t('fields.name'),
    },
  ];
}

export function useRoleColumns(
  onActionClick: OnActionClickFn<SystemRoleApi.SystemRole>,
  onStatusChange: (
    newStatus: number,
    row: SystemRoleApi.SystemRole,
  ) => Promise<boolean | undefined>,
  canManage: boolean,
  isSuperAdmin = false,
): VxeTableGridOptions<SystemRoleApi.SystemRole>['columns'] {
  const columns: VxeTableGridOptions<SystemRoleApi.SystemRole>['columns'] = [
    { fixed: 'left', type: 'seq', width: 52, title: '#' },
    {
      align: 'left',
      className: 'col-sys-code',
      field: 'code',
      minWidth: 140,
      slots: { default: 'code' },
      title: t('fields.code'),
    },
    {
      align: 'left',
      field: 'name',
      minWidth: 120,
      title: t('fields.name'),
    },
    {
      align: 'center',
      cellRender: { name: 'CellTag', options: dataScopeTagOptions() },
      field: 'dataScope',
      width: 120,
      title: t('fields.dataScope'),
    },
    buildStatusColumn<SystemRoleApi.SystemRole>(
      canManage,
      onStatusChange,
      'status',
      {
        attrs: {
          disabled: (row: SystemRoleApi.SystemRole) =>
            !canManageBuiltinRoleRow(row.code, isSuperAdmin),
        },
      },
    ),
    {
      align: 'left',
      field: 'remark',
      minWidth: 160,
      showOverflow: 'tooltip',
      title: t('fields.remark'),
    },
    {
      align: 'left',
      field: 'permissions',
      minWidth: 160,
      slots: { default: 'permissions' },
      title: t('fields.permissions'),
    },
  ];
  const operation = buildOperationColumn(canManage, onActionClick, {
    nameField: 'name',
    nameTitle: t('fields.name'),
    operationOptions: [
      {
        code: 'edit',
        show: (row: SystemRoleApi.SystemRole) =>
          canManageBuiltinRoleRow(row.code, isSuperAdmin),
      },
      {
        code: 'delete',
        show: (row: SystemRoleApi.SystemRole) => canDeleteRoleRow(row.code),
      },
    ],
  });
  if (operation) {
    columns.push(operation);
  }
  return columns;
}

export function filterRoles(
  source: SystemRoleApi.SystemRole[],
  filters: { code?: string; name?: string } = {},
) {
  const match = (value: string, keyword?: string) => {
    if (!keyword?.trim()) {
      return true;
    }
    return value.toLowerCase().includes(keyword.trim().toLowerCase());
  };

  return source.filter(
    (item) => match(item.code, filters.code) && match(item.name, filters.name),
  );
}

export function toRoleSavePayload(
  values: Record<string, any>,
): SystemRoleApi.RoleSave {
  const dataScope = values.dataScope;
  return {
    code: values.code,
    name: values.name,
    dataScope,
    status: values.status ?? 1,
    remark: values.remark,
    permissionCodes: values.permissionCodes ?? [],
    assignedUserIds:
      dataScope === 'ASSIGNED' ? stripLockedSelf(values.assignedUserIds) : [],
  };
}

export function rowToRoleFormValues(row: SystemRoleApi.SystemRole) {
  return {
    code: row.code,
    name: row.name,
    dataScope: row.dataScope,
    status: row.status,
    remark: row.remark,
    permissionCodes: row.permissions,
    assignedUserIds:
      row.dataScope === 'ASSIGNED'
        ? withLockedSelf(row.assignedUserIds)
        : [ASSIGNED_SELF_SENTINEL],
  };
}
