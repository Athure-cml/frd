import type { VbenFormSchema } from '#/adapter/form';
import type { OnActionClickFn, VxeTableGridOptions } from '#/adapter/vxe-table';
import type { QuoteApi } from '#/api/quote';

import { getCustomerList } from '#/api/customer';
import { $t } from '#/locales';

import { buildOperationColumn } from '../../system/shared/columns';
import { QUOTE_SHEET_COLUMNS, sheetCellValue } from '../shared/sheet-columns';

const t = (key: string) => $t(`page.quote.${key}`);

export function getTransportModeOptions() {
  return [
    { label: t('transportMode.ROAD'), value: 'ROAD' },
    { label: t('transportMode.SEA'), value: 'SEA' },
    { label: t('transportMode.RAIL'), value: 'RAIL' },
  ];
}

export const transportModeTagOptions = () => [
  { color: 'blue', label: t('transportMode.ROAD'), value: 'ROAD' },
  { color: 'cyan', label: t('transportMode.SEA'), value: 'SEA' },
  { color: 'purple', label: t('transportMode.RAIL'), value: 'RAIL' },
];

export const statusTagOptions = () => [
  { color: 'default', label: t('status.DRAFT'), value: 'DRAFT' },
  { color: 'success', label: t('status.EFFECTIVE'), value: 'EFFECTIVE' },
  { color: 'processing', label: t('status.FOLLOWING'), value: 'FOLLOWING' },
  { color: 'success', label: t('status.WON'), value: 'WON' },
  { color: 'warning', label: t('status.EXPIRED'), value: 'EXPIRED' },
  { color: 'error', label: t('status.VOIDED'), value: 'VOIDED' },
  { color: 'processing', label: t('status.PENDING'), value: 'PENDING' },
  { color: 'blue', label: t('status.SENT'), value: 'SENT' },
  { color: 'error', label: t('status.LOST'), value: 'LOST' },
];

export function useQuoteSearchSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      componentProps: { autocomplete: 'off' },
      fieldName: 'quoteNo',
      label: t('fields.quoteNo'),
    },
    {
      component: 'ApiSelect',
      componentProps: {
        allowClear: true,
        api: async () => {
          const result = await getCustomerList({
            page: 1,
            pageSize: 200,
            status: 1,
          });
          return result.items;
        },
        class: 'w-full',
        labelField: 'name',
        valueField: 'name',
      },
      fieldName: 'customerName',
      label: t('fields.customerName'),
    },
    {
      component: 'Select',
      componentProps: {
        allowClear: true,
        class: 'w-full',
        options: statusTagOptions(),
      },
      fieldName: 'status',
      label: t('fields.status'),
    },
    {
      component: 'Input',
      fieldName: 'zipCode',
      label: 'Zip code',
    },
    {
      component: 'Input',
      fieldName: 'city',
      label: 'City',
    },
    {
      component: 'Input',
      fieldName: 'state',
      label: 'State',
    },
    {
      component: 'Input',
      fieldName: 'por',
      label: 'POR',
    },
    {
      component: 'Input',
      fieldName: 'pol',
      label: 'POL',
    },
    {
      component: 'Input',
      fieldName: 'pod',
      label: 'POD',
    },
    {
      component: 'Input',
      fieldName: 'ssl',
      label: 'SSL',
    },
    {
      component: 'Input',
      fieldName: 'followUpByName',
      label: t('fields.followUpBy'),
    },
  ];
}

function transportModeLabel(value: string) {
  const option = getTransportModeOptions().find((item) => item.value === value);
  return option?.label ?? value;
}

export { transportModeLabel };

export function quoteRowClassName({ row }: { row: QuoteApi.QuoteListItem }) {
  if (row.voided) {
    return 'quote-row-voided';
  }
  if (row.expired) {
    return 'quote-row-expired';
  }
  return '';
}

export function useQuoteColumns(
  onActionClick: OnActionClickFn<QuoteApi.QuoteListItem>,
  canEdit: boolean,
  canDelete: boolean,
  canVoid: boolean,
): VxeTableGridOptions<QuoteApi.QuoteListItem>['columns'] {
  const operationOptions: Array<Record<string, any> | string> = [
    { code: 'view', text: t('actions.view') },
  ];
  if (canEdit) {
    operationOptions.push({
      code: 'edit',
      show: (row: QuoteApi.QuoteListItem) =>
        row.status === 'DRAFT' ||
        row.status === 'EFFECTIVE' ||
        row.status === 'FOLLOWING',
      text: $t('common.edit'),
    });
  }
  if (canVoid) {
    operationOptions.push({
      code: 'void',
      danger: true,
      show: (row: QuoteApi.QuoteListItem) =>
        !row.voided && row.status !== 'WON',
      text: t('actions.void'),
    });
  }
  if (canDelete) {
    operationOptions.push({
      code: 'delete',
      danger: true,
      show: (row: QuoteApi.QuoteListItem) => row.status === 'DRAFT',
      text: $t('common.delete'),
    });
  }

  const operationColumn = buildOperationColumn(
    canEdit || canDelete || canVoid,
    onActionClick,
    {
      nameField: 'quoteNo',
      nameTitle: t('fields.quoteNo'),
      operationOptions,
    },
  );

  const sheetCols = QUOTE_SHEET_COLUMNS.map((col) => ({
    field: `sheet.${col.field}`,
    formatter: ({ row }: { row: QuoteApi.QuoteListItem }) =>
      sheetCellValue(row.sheet, col.field),
    minWidth: col.width ?? 100,
    showOverflow: true,
    title: col.title,
  }));

  const columns: VxeTableGridOptions<QuoteApi.QuoteListItem>['columns'] = [
    { type: 'checkbox', width: 48, fixed: 'left' },
    {
      field: 'quoteNo',
      fixed: 'left',
      minWidth: 130,
      slots: { default: 'quoteNo' },
      title: t('fields.quoteNo'),
    },
    {
      field: 'customerName',
      fixed: 'left',
      minWidth: 120,
      title: t('fields.customerName'),
    },
    ...sheetCols,
    {
      field: 'currency',
      title: t('fields.currency'),
      width: 72,
    },
    {
      field: 'validUntil',
      title: t('fields.validUntil'),
      width: 110,
    },
    {
      align: 'center',
      cellRender: {
        name: 'CellTag',
        options: statusTagOptions(),
      },
      field: 'status',
      title: t('fields.status'),
      width: 96,
    },
    {
      field: 'followUpByName',
      title: t('fields.followUpBy'),
      width: 96,
    },
    {
      field: 'createdByName',
      title: t('fields.createdBy'),
      width: 88,
    },
    {
      field: 'updatedAt',
      formatter: ({ cellValue }: { cellValue?: string }) => cellValue || '—',
      title: t('fields.updatedAt'),
      width: 160,
    },
  ];

  if (operationColumn) {
    columns.push(operationColumn);
  }

  return columns;
}

export function formatQuoteAmount(quantity: number, unitPrice: number) {
  return Number((quantity * unitPrice).toFixed(2));
}
