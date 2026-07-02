import type { VbenFormSchema } from '#/adapter/form';
import type { OnActionClickFn, VxeTableGridOptions } from '#/adapter/vxe-table';
import type { GlobalPortApi } from '#/api/master-data/global-port';

import { $t } from '#/locales';

import { buildOperationColumn } from '../../system/shared/columns';

const PORT_TYPE_OPTIONS: { label: string; value: GlobalPortApi.PortType }[] = [
  { label: 'Seaport', value: 'SEAPORT' },
  { label: 'Inland', value: 'INLAND' },
  { label: 'Rail', value: 'RAIL' },
  { label: 'Airport', value: 'AIRPORT' },
  { label: 'Other', value: 'OTHER' },
];

export function formatPortType(value?: GlobalPortApi.PortType) {
  if (!value) {
    return '';
  }
  return $t(`page.masterData.portType.${value}`);
}

export function useGlobalPortFormSchema(isEdit: boolean): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      componentProps: {
        disabled: isEdit,
        maxlength: 8,
        style: { textTransform: 'uppercase' },
      },
      fieldName: 'code',
      label: 'Port Code',
      rules: 'required',
    },
    {
      component: 'Input',
      componentProps: { maxlength: 128 },
      fieldName: 'nameEn',
      label: 'Name EN',
      rules: 'required',
    },
    {
      component: 'Input',
      componentProps: { maxlength: 128 },
      fieldName: 'nameZh',
      label: 'Name ZH',
    },
    {
      component: 'Select',
      componentProps: {
        allowClear: true,
        options: PORT_TYPE_OPTIONS,
      },
      defaultValue: 'SEAPORT',
      fieldName: 'portType',
      label: 'Port Type',
    },
    {
      component: 'Input',
      componentProps: { maxlength: 128 },
      fieldName: 'route',
      label: 'Route',
    },
    {
      component: 'Input',
      componentProps: { maxlength: 128 },
      fieldName: 'countryRegion',
      label: 'Country/Region',
    },
  ];
}

export function useGlobalPortSearchSchema(): VbenFormSchema[] {
  return [
    { component: 'Input', fieldName: 'code', label: 'Port Code' },
    { component: 'Input', fieldName: 'nameEn', label: 'Name EN' },
    { component: 'Input', fieldName: 'nameZh', label: 'Name ZH' },
    {
      component: 'Select',
      componentProps: {
        allowClear: true,
        options: PORT_TYPE_OPTIONS,
      },
      fieldName: 'portType',
      label: 'Port Type',
    },
    { component: 'Input', fieldName: 'route', label: 'Route' },
    { component: 'Input', fieldName: 'countryRegion', label: 'Country/Region' },
  ];
}

export function useGlobalPortColumns(
  onActionClick: OnActionClickFn<GlobalPortApi.GlobalPort>,
  canManage: boolean,
): VxeTableGridOptions<GlobalPortApi.GlobalPort>['columns'] {
  const columns: VxeTableGridOptions<GlobalPortApi.GlobalPort>['columns'] = [
    { field: 'code', minWidth: 100, title: 'Port Code', width: 110 },
    { field: 'nameEn', minWidth: 140, title: 'Name EN' },
    { field: 'nameZh', minWidth: 120, title: 'Name ZH' },
    {
      field: 'portType',
      formatter: ({ cellValue }) => formatPortType(cellValue),
      minWidth: 100,
      title: 'Port Type',
      width: 110,
    },
    { field: 'route', minWidth: 120, title: 'Route' },
    { field: 'countryRegion', minWidth: 130, title: 'Country/Region' },
  ];
  const operation = buildOperationColumn(canManage, onActionClick, {
    nameField: 'code',
    nameTitle: 'Port Code',
  });
  if (operation) {
    columns.push(operation);
  }
  return columns;
}

export function toGlobalPortSavePayload(
  values: Record<string, any>,
): GlobalPortApi.GlobalPortSave {
  return {
    code: String(values.code ?? '')
      .trim()
      .toUpperCase(),
    countryRegion: values.countryRegion?.trim() ?? '',
    nameEn: String(values.nameEn ?? '').trim(),
    nameZh: values.nameZh?.trim() ?? '',
    portType: values.portType ?? 'SEAPORT',
    route: values.route?.trim() ?? '',
  };
}

export function getGlobalPortRowName(row: GlobalPortApi.GlobalPort) {
  return row.code;
}
