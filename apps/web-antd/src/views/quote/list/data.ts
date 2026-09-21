import type { VbenFormSchema } from '#/adapter/form';
import type { OnActionClickFn, VxeTableGridOptions } from '#/adapter/vxe-table';
import type { QuoteApi } from '#/api/quote';

import { getCustomerList } from '#/api/customer';
import { getFumigationStationList } from '#/api/quote';
import { $t } from '#/locales';

import { createPortSelectProps } from '../../cost-library/shared/freight-schema';
import { buildOperationColumn } from '../../system/shared/columns';
import {
  canShowQuoteVoid,
  isQuoteDeletable,
  isQuoteEditable,
  normalizeQuoteStatus,
} from '../shared/quote-status';
import {
  formatQuoteListCellValue,
  QUOTE_LIST_COLUMNS,
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

const QUOTE_PORT_TYPES = ['INLAND', 'RAIL', 'SEAPORT'] as const;

export function useQuoteSearchSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      componentProps: {
        allowClear: true,
        autocomplete: 'off',
        class: 'w-full',
      },
      fieldName: 'quoteNo',
      label: 'QUOTE NO',
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
        optionFilterProp: 'label',
        showSearch: true,
        valueField: 'name',
      },
      fieldName: 'customerName',
      label: 'CLIENT',
    },
    {
      component: 'ApiSelect',
      componentProps: createPortSelectProps({
        portTypes: [...QUOTE_PORT_TYPES],
        requireKeyword: true,
      }),
      fieldName: 'por',
      label: 'POR',
    },
    {
      component: 'ApiSelect',
      componentProps: createPortSelectProps({
        portTypes: [...QUOTE_PORT_TYPES],
        requireKeyword: true,
      }),
      fieldName: 'pol',
      label: 'POL',
    },
    {
      component: 'ApiSelect',
      componentProps: createPortSelectProps({
        portTypes: [...QUOTE_PORT_TYPES],
        requireKeyword: true,
      }),
      fieldName: 'pod',
      label: 'POD',
    },
    {
      component: 'Input',
      componentProps: {
        allowClear: true,
        autocomplete: 'off',
        class: 'w-full',
      },
      fieldName: 'pickUpAddress',
      label: 'PICK UP ADDRESS',
    },
    {
      component: 'ApiSelect',
      componentProps: {
        allowClear: true,
        api: async () => {
          const stations = await getFumigationStationList();
          return stations.map((item) => ({ label: item, value: item }));
        },
        class: 'w-full',
        optionFilterProp: 'label',
        showSearch: true,
      },
      fieldName: 'fumigationPoint',
      label: 'STATION',
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

  const sheetCols = QUOTE_LIST_COLUMNS.map((col) => ({
    field: col.listSource === 'row' ? col.field : `sheet.${String(col.field)}`,
    formatter: ({ row }: { row: QuoteApi.QuoteListItem }) =>
      formatQuoteListCellValue(row, col),
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
      title: 'CLIENT',
    },
    ...sheetCols,
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
