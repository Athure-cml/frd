import type { VbenFormSchema } from '#/adapter/form';
import type { OnActionClickFn, VxeTableGridOptions } from '#/adapter/vxe-table';
import type { GlobalPortApi } from '#/api/master-data/global-port';

import { $t } from '#/locales';

import {
  buildCheckboxColumn,
  buildSeqColumn,
} from '../../system/shared/columns';

const PORT_TYPE_OPTIONS: { label: string; value: GlobalPortApi.PortType }[] = [
  { label: '港口', value: 'SEAPORT' },
  { label: '内陆点', value: 'INLAND' },
  { label: '铁路场站', value: 'RAIL' },
  { label: '机场', value: 'AIRPORT' },
  { label: '其他', value: 'OTHER' },
];

export function formatPortType(value?: GlobalPortApi.PortType) {
  if (!value) {
    return '';
  }
  return $t(`page.masterData.portType.${value}`);
}

export function useGlobalPortFormSchema(_isEdit: boolean): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      componentProps: { class: 'w-full', maxlength: 128 },
      fieldName: 'nameEn',
      label: '名称',
      rules: 'required',
    },
    {
      component: 'Select',
      componentProps: {
        allowClear: true,
        class: 'w-full',
        options: PORT_TYPE_OPTIONS,
      },
      defaultValue: 'SEAPORT',
      fieldName: 'portType',
      label: '类型',
      rules: 'required',
    },
    {
      component: 'Input',
      componentProps: { class: 'w-full', maxlength: 128 },
      fieldName: 'countryRegion',
      label: '国家',
      rules: 'required',
    },
  ];
}

export function useGlobalPortSearchSchema(): VbenFormSchema[] {
  return [
    { component: 'Input', fieldName: 'nameEn', label: '名称' },
    {
      component: 'Select',
      componentProps: {
        allowClear: true,
        options: PORT_TYPE_OPTIONS,
      },
      fieldName: 'portType',
      label: '类型',
    },
    { component: 'Input', fieldName: 'countryRegion', label: '国家' },
  ];
}

export function useGlobalPortColumns(
  onActionClick: OnActionClickFn<GlobalPortApi.GlobalPort>,
  canManage: boolean,
): VxeTableGridOptions<GlobalPortApi.GlobalPort>['columns'] {
  const columns: VxeTableGridOptions<GlobalPortApi.GlobalPort>['columns'] = [
    buildCheckboxColumn(),
    buildSeqColumn(),
    { field: 'nameEn', minWidth: 200, title: '名称' },
    {
      field: 'portType',
      formatter: ({ cellValue }) => formatPortType(cellValue),
      minWidth: 120,
      title: '类型',
    },
    { field: 'countryRegion', minWidth: 100, title: '国家' },
  ];
  if (canManage) {
    columns.push({
      align: 'center',
      cellRender: {
        attrs: {
          nameField: 'nameEn',
          nameTitle: '名称',
          onClick: onActionClick,
        },
        name: 'CellOperation',
        options: ['edit', 'delete'],
      },
      field: 'operation',
      minWidth: 140,
      showOverflow: false,
      title: $t('page.system.fields.operation'),
      width: 140,
    });
  }
  return columns;
}

export function toGlobalPortSavePayload(
  values: Record<string, any>,
): GlobalPortApi.GlobalPortSave {
  return {
    code: '',
    countryRegion: String(values.countryRegion ?? '').trim(),
    nameEn: String(values.nameEn ?? '').trim(),
    nameZh: '',
    portType: values.portType ?? 'SEAPORT',
    route: '',
  };
}

export function getGlobalPortRowName(row: GlobalPortApi.GlobalPort) {
  return row.nameEn || row.code;
}
