import type { VbenFormSchema } from '#/adapter/form';
import type { OnActionClickFn, VxeTableGridOptions } from '#/adapter/vxe-table';
import type { QuoteApi } from '#/api/quote';

import { getCustomerList } from '#/api/customer';
import { $t } from '#/locales';

import { buildOperationColumn } from '../../system/shared/columns';
import {
  canShowQuoteVoid,
  isQuoteDeletable,
  isQuoteEditable,
  normalizeQuoteStatus,
} from '../shared/quote-status';
import {
  formatQuoteDate,
  QUOTE_SHEET_COLUMNS,
  sheetCellValue,
} from '../shared/sheet-columns';

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
  {
    color: 'processing',
    label: t('status.PENDING_APPROVAL'),
    value: 'PENDING_APPROVAL',
  },
  { color: 'blue', label: t('status.SENT'), value: 'SENT' },
  { color: 'success', label: t('status.WON'), value: 'WON' },
  { color: 'warning', label: t('status.REJECTED'), value: 'REJECTED' },
  { color: 'warning', label: t('status.EXPIRED'), value: 'EXPIRED' },
  { color: 'error', label: t('status.VOIDED'), value: 'VOIDED' },
  // 兼容旧数据展示
  {
    color: 'processing',
    label: t('status.PENDING_APPROVAL'),
    value: 'PENDING',
  },
  { color: 'blue', label: t('status.SENT'), value: 'EFFECTIVE' },
  { color: 'blue', label: t('status.SENT'), value: 'FOLLOWING' },
  { color: 'warning', label: t('status.REJECTED'), value: 'LOST' },
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
  canApprove = false,
  canOperateRow: (row: QuoteApi.QuoteListItem) => boolean = () => true,
): VxeTableGridOptions<QuoteApi.QuoteListItem>['columns'] {
  const operationOptions: Array<Record<string, any> | string> = [
    { code: 'view', text: t('actions.view') },
  ];
  if (canApprove) {
    operationOptions.push({
      code: 'send',
      show: (row: QuoteApi.QuoteListItem) =>
        normalizeQuoteStatus(row.status) === 'PENDING_APPROVAL',
      text: t('actions.send'),
    });
  }
  if (canEdit) {
    operationOptions.push({
      code: 'edit',
      show: (row: QuoteApi.QuoteListItem) =>
        canOperateRow(row) && isQuoteEditable(row.status),
      text: $t('common.edit'),
    });
  }
  if (canVoid) {
    operationOptions.push({
      code: 'void',
      danger: true,
      show: (row: QuoteApi.QuoteListItem) =>
        canOperateRow(row) && canShowQuoteVoid(row.status),
      text: t('actions.void'),
    });
  }
  if (canDelete) {
    operationOptions.push({
      code: 'delete',
      danger: true,
      show: (row: QuoteApi.QuoteListItem) =>
        canOperateRow(row) && isQuoteDeletable(row.status),
      text: $t('common.delete'),
    });
  }

  const operationColumn = buildOperationColumn(
    canEdit || canDelete || canVoid || canApprove,
    onActionClick,
    {
      nameField: 'quoteNo',
      nameTitle: 'QUOTE NO',
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
      title: 'QUOTE NO',
    },
    {
      field: 'customerName',
      fixed: 'left',
      minWidth: 120,
      title: 'CLINET',
    },
    ...sheetCols,
    {
      field: 'createdAt',
      formatter: ({ cellValue }: { cellValue?: string }) =>
        formatQuoteDate(cellValue),
      minWidth: 120,
      title: 'QUOTE DATA',
    },
    {
      align: 'center',
      cellRender: {
        name: 'CellTag',
        options: statusTagOptions(),
      },
      field: 'status',
      fixed: 'right',
      title: '状态',
      width: 96,
    },
  ];

  if (operationColumn) {
    operationColumn.minWidth = 220;
    operationColumn.width = 220;
    operationColumn.fixed = 'right';
    columns.push(operationColumn);
  }

  return columns;
}

export function formatQuoteAmount(quantity: number, unitPrice: number) {
  return Number((quantity * unitPrice).toFixed(2));
}
