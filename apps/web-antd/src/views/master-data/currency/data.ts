import type { VbenFormSchema } from '#/adapter/form';
import type { OnActionClickFn, VxeTableGridOptions } from '#/adapter/vxe-table';
import type { CurrencyApi } from '#/api/currency';

import { $t } from '#/locales';

import { buildOperationColumn } from '../../system/shared/columns';
import { statusTagOptions } from '../../system/shared/tags';

const t = (key: string) => $t(`page.masterData.${key}`);

export function useCurrencyFormSchema(isEdit: boolean): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      componentProps: {
        disabled: isEdit,
        maxlength: 8,
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
      component: 'Input',
      componentProps: { maxlength: 8 },
      fieldName: 'symbol',
      label: t('fields.symbol'),
    },
    {
      component: 'InputNumber',
      componentProps: { class: 'w-full', max: 6, min: 0 },
      defaultValue: 2,
      fieldName: 'decimalPlaces',
      label: t('fields.decimalPlaces'),
      rules: 'required',
    },
    {
      component: 'Switch',
      fieldName: 'base',
      label: t('fields.base'),
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
  ];
}

export function useCurrencySearchSchema(): VbenFormSchema[] {
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

export function useCurrencyColumns(
  onActionClick: OnActionClickFn<CurrencyApi.Currency>,
  canManage: boolean,
): VxeTableGridOptions<CurrencyApi.Currency>['columns'] {
  const columns: VxeTableGridOptions<CurrencyApi.Currency>['columns'] = [
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
      minWidth: 120,
      title: t('fields.name'),
    },
    {
      align: 'center',
      field: 'symbol',
      title: t('fields.symbol'),
      width: 80,
    },
    {
      align: 'center',
      field: 'decimalPlaces',
      title: t('fields.decimalPlaces'),
      width: 88,
    },
    {
      align: 'center',
      cellRender: {
        name: 'CellTag',
        options: [
          { color: 'processing', label: t('baseTag'), value: true },
          { color: 'default', label: '—', value: false },
        ],
      },
      field: 'base',
      title: t('fields.base'),
      width: 96,
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
  ];
  const operation = buildOperationColumn(canManage, onActionClick, {
    nameField: 'name',
    nameTitle: t('fields.name'),
    operationOptions: [
      'edit',
      {
        code: 'delete',
        show: (row: CurrencyApi.Currency) => !row.base,
      },
    ],
  });
  if (operation) {
    columns.push(operation);
  }
  return columns;
}

export function filterCurrencies(
  source: CurrencyApi.Currency[],
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

export function toCurrencySavePayload(
  values: Record<string, any>,
): CurrencyApi.CurrencySave {
  return {
    base: !!values.base,
    code: String(values.code ?? '')
      .trim()
      .toUpperCase(),
    decimalPlaces: values.decimalPlaces ?? 2,
    name: values.name,
    sort: values.sort ?? 0,
    status: values.status ?? 1,
    symbol: values.symbol?.trim() || undefined,
  };
}
