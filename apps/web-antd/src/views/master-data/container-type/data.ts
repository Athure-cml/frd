import type { VbenFormSchema } from '#/adapter/form';
import type { OnActionClickFn, VxeTableGridOptions } from '#/adapter/vxe-table';
import type { ContainerTypeApi } from '#/api/master-data/container-type';

import { $t } from '#/locales';

import { buildOperationColumn } from '../../system/shared/columns';
import { statusTagOptions } from '../../system/shared/tags';

const t = (key: string) => $t(`page.masterData.${key}`);

export function useContainerTypeFormSchema(isEdit: boolean): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      componentProps: {
        disabled: isEdit,
        maxlength: 32,
        style: { textTransform: 'uppercase' },
      },
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
      component: 'InputNumber',
      componentProps: { class: 'w-full', min: 0 },
      defaultValue: 0,
      fieldName: 'sort',
      label: t('fields.sort'),
    },
    {
      component: 'RadioGroup',
      componentProps: {
        buttonStyle: 'solid',
        options: [
          { label: $t('page.system.status.enabled'), value: 1 },
          { label: $t('page.system.status.disabled'), value: 0 },
        ],
        optionType: 'button',
      },
      defaultValue: 1,
      fieldName: 'status',
      label: $t('page.system.fields.status'),
    },
    {
      component: 'Textarea',
      componentProps: { maxlength: 256, rows: 2 },
      fieldName: 'remark',
      formItemClass: 'col-span-full',
      label: t('fields.remark'),
    },
  ];
}

export function useContainerTypeSearchSchema(): VbenFormSchema[] {
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

export function useContainerTypeColumns(
  onActionClick: OnActionClickFn<ContainerTypeApi.ContainerType>,
  canManage: boolean,
): VxeTableGridOptions<ContainerTypeApi.ContainerType>['columns'] {
  const columns: VxeTableGridOptions<ContainerTypeApi.ContainerType>['columns'] =
    [
      {
        align: 'left',
        className: 'col-sys-code',
        field: 'code',
        minWidth: 96,
        slots: { default: 'code' },
        title: t('fields.code'),
      },
      {
        field: 'name',
        minWidth: 160,
        title: t('fields.name'),
      },
      {
        align: 'center',
        field: 'sort',
        title: t('fields.sort'),
        width: 72,
      },
      {
        align: 'center',
        cellRender: { name: 'CellTag', options: statusTagOptions() },
        field: 'status',
        title: $t('page.system.fields.status'),
        width: 96,
      },
      {
        field: 'remark',
        minWidth: 140,
        title: t('fields.remark'),
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

export function toContainerTypeSavePayload(
  values: Record<string, any>,
): ContainerTypeApi.ContainerTypeSave {
  return {
    code: String(values.code ?? '')
      .trim()
      .toUpperCase(),
    name: values.name,
    remark: values.remark?.trim() || undefined,
    sort: values.sort ?? 0,
    status: values.status ?? 1,
  };
}
