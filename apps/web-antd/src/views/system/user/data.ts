import type { VbenFormSchema } from '#/adapter/form';
import type { OnActionClickFn, VxeTableGridOptions } from '#/adapter/vxe-table';
import type { SystemUserApi } from '#/api/system/user';

import { getDepartmentList } from '#/api/system/dept';
import { getRoleList } from '#/api/system/role';
import { $t } from '#/locales';

import { buildOperationColumn, buildStatusColumn } from '../shared/columns';
import { dataScopeTagOptions } from '../shared/tags';

const t = (key: string) => $t(`page.system.${key}`);

export function useUserFormSchema(isEdit: boolean): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      componentProps: { disabled: isEdit, maxlength: 64 },
      fieldName: 'username',
      label: t('fields.username'),
      rules: 'required',
    },
    {
      component: 'InputPassword',
      componentProps: { maxlength: 64 },
      dependencies: {
        if: () => !isEdit,
        triggerFields: ['username'],
      },
      fieldName: 'password',
      label: t('fields.password'),
      rules: isEdit ? undefined : 'required',
    },
    {
      component: 'Input',
      componentProps: { maxlength: 64 },
      fieldName: 'realName',
      label: t('fields.realName'),
      rules: 'required',
    },
    {
      component: 'ApiSelect',
      componentProps: {
        api: getDepartmentList,
        class: 'w-full',
        labelField: 'name',
        valueField: 'id',
      },
      fieldName: 'deptId',
      label: t('fields.dept'),
      rules: 'selectRequired',
    },
    {
      component: 'ApiSelect',
      componentProps: {
        api: async () => {
          const roles = await getRoleList();
          return roles.map((role) => ({
            label: role.name,
            value: role.code,
          }));
        },
        class: 'w-full',
        mode: 'multiple',
      },
      fieldName: 'roleCodes',
      label: t('fields.roles'),
      rules: 'selectRequired',
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
      component: 'InputPassword',
      componentProps: { maxlength: 64 },
      dependencies: {
        if: () => isEdit,
        triggerFields: ['username'],
      },
      fieldName: 'newPassword',
      help: t('fields.passwordOptional'),
      label: t('fields.resetPassword'),
    },
  ];
}

export function useUserSearchSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      componentProps: {
        autocomplete: 'off',
        name: 'user-search-keyword',
      },
      fieldName: 'keyword',
      label: t('fields.username'),
    },
    {
      component: 'ApiSelect',
      componentProps: {
        allowClear: true,
        api: getDepartmentList,
        class: 'w-full',
        labelField: 'name',
        valueField: 'id',
      },
      fieldName: 'deptId',
      label: t('fields.dept'),
    },
    {
      component: 'Select',
      componentProps: {
        allowClear: true,
        options: [
          { label: t('status.enabled'), value: 1 },
          { label: t('status.disabled'), value: 0 },
        ],
      },
      fieldName: 'status',
      label: t('fields.status'),
    },
  ];
}

export function useUserColumns(
  onActionClick: OnActionClickFn<SystemUserApi.SystemUser>,
  onStatusChange: (
    newStatus: number,
    row: SystemUserApi.SystemUser,
  ) => Promise<boolean | undefined>,
  canManage: boolean,
): VxeTableGridOptions<SystemUserApi.SystemUser>['columns'] {
  const columns: VxeTableGridOptions<SystemUserApi.SystemUser>['columns'] = [
    { fixed: 'left', type: 'seq', width: 52, title: '#' },
    {
      align: 'left',
      className: 'col-sys-code',
      field: 'username',
      minWidth: 120,
      slots: { default: 'username' },
      title: t('fields.username'),
    },
    {
      align: 'left',
      field: 'realName',
      minWidth: 120,
      title: t('fields.realName'),
    },
    {
      align: 'left',
      field: 'dept.name',
      minWidth: 120,
      title: t('fields.dept'),
    },
    {
      align: 'left',
      field: 'roleNames',
      minWidth: 200,
      slots: { default: 'roles' },
      title: t('fields.roles'),
    },
    {
      align: 'center',
      cellRender: { name: 'CellTag', options: dataScopeTagOptions() },
      field: 'dataScope',
      width: 112,
      title: t('fields.dataScope'),
    },
    buildStatusColumn<SystemUserApi.SystemUser>(canManage, onStatusChange),
  ];
  const operation = buildOperationColumn(canManage, onActionClick, {
    nameField: 'realName',
    nameTitle: t('fields.realName'),
  });
  if (operation) {
    columns.push(operation);
  }
  return columns;
}

export function toUserCreatePayload(
  values: Record<string, any>,
): SystemUserApi.UserCreate {
  return {
    username: values.username,
    password: values.password,
    realName: values.realName,
    deptId: values.deptId,
    roleCodes: values.roleCodes,
    status: values.status ?? 1,
  };
}

export function toUserUpdatePayload(
  values: Record<string, any>,
  row: SystemUserApi.SystemUser,
): SystemUserApi.UserUpdate {
  return {
    realName: values.realName,
    deptId: values.deptId,
    roleCodes: values.roleCodes,
    status: values.status ?? row.status,
    password: values.newPassword || undefined,
  };
}

export function rowToUserFormValues(row: SystemUserApi.SystemUser) {
  return {
    username: row.username,
    realName: row.realName,
    deptId: row.dept.id,
    roleCodes: row.roles,
    status: row.status,
  };
}
