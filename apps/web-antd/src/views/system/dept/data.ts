import type { VbenFormSchema } from '#/adapter/form';
import type { OnActionClickFn, VxeTableGridOptions } from '#/adapter/vxe-table';
import type { SystemDeptApi } from '#/api/system/dept';

import { getDepartmentList } from '#/api/system/dept';
import { $t } from '#/locales';

import { buildOperationColumn } from '../shared/columns';
import { statusTagOptions } from '../shared/tags';

const t = (key: string) => $t(`page.system.${key}`);

export function useDeptFormSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      componentProps: { maxlength: 32 },
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
      component: 'ApiSelect',
      componentProps: {
        allowClear: true,
        api: getDepartmentList,
        class: 'w-full',
        labelField: 'name',
        valueField: 'id',
      },
      fieldName: 'parentId',
      label: t('fields.parentDept'),
    },
    {
      component: 'InputNumber',
      componentProps: { class: 'w-full', min: 0 },
      defaultValue: 0,
      fieldName: 'sort',
      label: t('fields.sort'),
      rules: 'required',
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
  ];
}

export function useDeptSearchSchema(): VbenFormSchema[] {
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

export function useDeptColumns(
  onActionClick: OnActionClickFn<SystemDeptApi.Department>,
  canManage: boolean,
): VxeTableGridOptions<SystemDeptApi.Department>['columns'] {
  const columns: VxeTableGridOptions<SystemDeptApi.Department>['columns'] = [
    { fixed: 'left', type: 'seq', width: 52, title: '#' },
    {
      align: 'left',
      className: 'col-sys-code',
      field: 'code',
      minWidth: 96,
      slots: { default: 'code' },
      title: t('fields.code'),
    },
    {
      align: 'left',
      field: 'name',
      minWidth: 140,
      title: t('fields.name'),
    },
    {
      align: 'center',
      className: 'col-sys-num',
      field: 'sort',
      width: 88,
      title: t('fields.sort'),
    },
    {
      align: 'center',
      cellRender: { name: 'CellTag', options: statusTagOptions() },
      field: 'status',
      width: 96,
      title: t('fields.status'),
    },
  ];
  const operation = buildOperationColumn(canManage, onActionClick, {
    nameField: 'name',
    nameTitle: t('fields.name'),
  });
  if (operation) {
    columns.push(operation);
  }
  return columns;
}

export function filterDepartments(
  source: SystemDeptApi.Department[],
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

export function toDeptSavePayload(
  values: Record<string, any>,
): SystemDeptApi.DepartmentSave {
  return {
    code: values.code,
    name: values.name,
    parentId: values.parentId ?? 0,
    sort: values.sort ?? 0,
    status: values.status ?? 1,
  };
}
