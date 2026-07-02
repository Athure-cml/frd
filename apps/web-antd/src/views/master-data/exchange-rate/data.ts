import type { VbenFormSchema } from '#/adapter/form';
import type { OnActionClickFn, VxeTableGridOptions } from '#/adapter/vxe-table';
import type { ExchangeRateApi } from '#/api/exchange-rate';

import { getBaseCurrencyCode, getEnabledCurrencyOptions } from '#/api/currency';
import { $t } from '#/locales';

import { buildOperationColumn } from '../../system/shared/columns';
import { statusTagOptions } from '../../system/shared/tags';

const t = (key: string) => $t(`page.masterData.${key}`);

export function useExchangeRateFormSchema(): VbenFormSchema[] {
  return [
    {
      component: 'ApiSelect',
      componentProps: {
        api: getEnabledCurrencyOptions,
        class: 'w-full',
      },
      fieldName: 'fromCurrency',
      label: t('fields.fromCurrency'),
      rules: 'selectRequired',
    },
    {
      component: 'ApiSelect',
      componentProps: {
        api: async () => {
          const base = await getBaseCurrencyCode();
          return [{ label: base, value: base }];
        },
        class: 'w-full',
        disabled: true,
      },
      defaultValue: 'CNY',
      fieldName: 'toCurrency',
      label: t('fields.toCurrency'),
      rules: 'selectRequired',
    },
    {
      component: 'InputNumber',
      componentProps: {
        class: 'w-full',
        min: 0,
        precision: 8,
        step: 0.0001,
      },
      fieldName: 'rate',
      help: t('hint.rateMeaning'),
      label: t('fields.rate'),
      rules: 'required',
    },
    {
      component: 'DatePicker',
      componentProps: { class: 'w-full', valueFormat: 'YYYY-MM-DD' },
      fieldName: 'effectiveDate',
      label: t('fields.effectiveDate'),
      rules: 'required',
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

export function useExchangeRateSearchSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      fieldName: 'fromCurrency',
      label: t('fields.fromCurrency'),
    },
    {
      component: 'Input',
      fieldName: 'toCurrency',
      label: t('fields.toCurrency'),
    },
  ];
}

export function useExchangeRateColumns(
  onActionClick: OnActionClickFn<ExchangeRateApi.ExchangeRate>,
  canManage: boolean,
): VxeTableGridOptions<ExchangeRateApi.ExchangeRate>['columns'] {
  const columns: VxeTableGridOptions<ExchangeRateApi.ExchangeRate>['columns'] =
    [
      {
        align: 'left',
        className: 'col-sys-code',
        field: 'fromCurrency',
        minWidth: 96,
        slots: { default: 'fromCurrency' },
        title: t('fields.fromCurrency'),
      },
      {
        align: 'left',
        className: 'col-sys-code',
        field: 'toCurrency',
        minWidth: 96,
        slots: { default: 'toCurrency' },
        title: t('fields.toCurrency'),
      },
      {
        align: 'right',
        field: 'rate',
        minWidth: 120,
        title: t('fields.rate'),
      },
      {
        field: 'effectiveDate',
        minWidth: 120,
        title: t('fields.effectiveDate'),
      },
      {
        align: 'center',
        cellRender: { name: 'CellTag', options: statusTagOptions() },
        field: 'status',
        title: $t('page.system.fields.status'),
        width: 96,
      },
      {
        field: 'updatedAt',
        minWidth: 168,
        title: $t('page.system.fields.updatedAt'),
      },
    ];
  const operation = buildOperationColumn(canManage, onActionClick, {
    nameField: 'fromCurrency',
    nameTitle: t('fields.fromCurrency'),
  });
  if (operation) {
    columns.push(operation);
  }
  return columns;
}

export function filterExchangeRates(
  source: ExchangeRateApi.ExchangeRate[],
  filters: { fromCurrency?: string; toCurrency?: string } = {},
) {
  const match = (value: string, keyword?: string) => {
    if (!keyword?.trim()) {
      return true;
    }
    return value.toLowerCase().includes(keyword.trim().toLowerCase());
  };
  return source.filter(
    (item) =>
      match(item.fromCurrency, filters.fromCurrency) &&
      match(item.toCurrency, filters.toCurrency),
  );
}

export function toExchangeRateSavePayload(
  values: Record<string, any>,
): ExchangeRateApi.ExchangeRateSave {
  return {
    effectiveDate: values.effectiveDate,
    fromCurrency: String(values.fromCurrency ?? '')
      .trim()
      .toUpperCase(),
    rate: Number(values.rate),
    status: values.status ?? 1,
    toCurrency: String(values.toCurrency ?? 'CNY')
      .trim()
      .toUpperCase(),
  };
}
