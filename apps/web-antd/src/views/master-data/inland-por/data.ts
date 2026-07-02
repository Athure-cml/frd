import type { VbenFormSchema } from '#/adapter/form';
import type { OnActionClickFn, VxeTableGridOptions } from '#/adapter/vxe-table';
import type { InlandPorApi } from '#/api/master-data/inland-por';

import { getGlobalPortOptions } from '#/api/master-data/global-port';

import { buildOperationColumn } from '../../system/shared/columns';

export function useInlandPorFormSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      componentProps: { maxlength: 128 },
      fieldName: 'name',
      label: 'POR',
      rules: 'required',
    },
    {
      component: 'ApiSelect',
      componentProps: {
        api: getGlobalPortOptions,
        class: 'w-full',
        showSearch: true,
      },
      fieldName: 'polId',
      label: 'POL',
      rules: 'selectRequired',
    },
    {
      component: 'Input',
      componentProps: { maxlength: 128 },
      fieldName: 'region',
      label: 'Region',
    },
  ];
}

export function useInlandPorSearchSchema(): VbenFormSchema[] {
  return [
    { component: 'Input', fieldName: 'name', label: 'POR' },
    { component: 'Input', fieldName: 'region', label: 'Region' },
  ];
}

export function useInlandPorColumns(
  onActionClick: OnActionClickFn<InlandPorApi.InlandPor>,
  canManage: boolean,
): VxeTableGridOptions<InlandPorApi.InlandPor>['columns'] {
  const columns: VxeTableGridOptions<InlandPorApi.InlandPor>['columns'] = [
    { field: 'name', minWidth: 140, title: 'POR' },
    { field: 'polCode', minWidth: 100, title: 'POL', width: 110 },
    { field: 'polNameEn', minWidth: 140, title: 'POL Name EN' },
    { field: 'region', minWidth: 120, title: 'Region' },
  ];
  const operation = buildOperationColumn(canManage, onActionClick, {
    nameField: 'name',
    nameTitle: 'POR',
  });
  if (operation) {
    columns.push(operation);
  }
  return columns;
}

export function toInlandPorSavePayload(
  values: Record<string, any>,
): InlandPorApi.InlandPorSave {
  return {
    name: String(values.name ?? '').trim(),
    polId: values.polId,
    region: values.region?.trim() ?? '',
  };
}

export function getInlandPorRowName(row: InlandPorApi.InlandPor) {
  return row.name;
}
