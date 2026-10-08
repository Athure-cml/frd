import type { VbenFormSchema } from '#/adapter/form';
import type { OnActionClickFn, VxeTableGridOptions } from '#/adapter/vxe-table';
import type { QuoteApi, QuoteServiceType } from '#/api/quote';

import { getCustomerList } from '#/api/customer';
import { getFumigationStationList } from '#/api/quote';
import { $t } from '#/locales';

import { createPortSelectProps } from '../../cost-library/shared/freight-schema';
import { buildOperationColumn } from '../../system/shared/columns';
import {
  canShowQuoteVoid,
  isQuoteDeletable,
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

export function getServiceTypeOptions() {
  return [
    { label: t('serviceType.SEA'), value: 'SEA' },
    { label: t('serviceType.FUMIGATION'), value: 'FUMIGATION' },
    { label: t('serviceType.TRUCK'), value: 'TRUCK' },
    { label: t('serviceType.INSURANCE'), value: 'INSURANCE' },
    { label: t('serviceType.TRADE'), value: 'TRADE' },
    { label: t('serviceType.OTHER'), value: 'OTHER' },
  ];
}

export const transportModeTagOptions = () => [
  { color: 'blue', label: t('transportMode.ROAD'), value: 'ROAD' },
  { color: 'cyan', label: t('transportMode.SEA'), value: 'SEA' },
  { color: 'purple', label: t('transportMode.RAIL'), value: 'RAIL' },
];

/** 待审批报价：Ant Design warning 浅底 + 深橙字 */
export const QUOTE_PENDING_APPROVAL_TAG_CLASS = 'quote-status-tag--pending';
/** 变更中：浅紫底 + 深紫字 */
export const QUOTE_REVISING_TAG_CLASS = 'quote-status-tag--revising';
/** 已归档：浅灰蓝底 + 深蓝灰字 */
export const QUOTE_SUPERSEDED_TAG_CLASS = 'quote-status-tag--superseded';

export function resolveQuoteStatusTag(
  status: QuoteApi.QuoteListItem['status'],
) {
  const normalized = normalizeQuoteStatus(status);
  const matched = statusTagOptions().find((item) => item.value === normalized);
  return {
    className: matched?.className,
    color: matched?.color ?? 'default',
    label: matched?.label ?? status,
  };
}

export function resolveQuoteListStatusTag(row: QuoteApi.QuoteListItem) {
  const normalized = normalizeQuoteStatus(row.status);
  // 终态 / 变更中优先展示正式状态，不被成本风险标签覆盖
  if (
    row.costRiskActive &&
    !row.voided &&
    normalized !== 'REVISING' &&
    normalized !== 'SUPERSEDED' &&
    normalized !== 'VOIDED' &&
    normalized !== 'WON' &&
    normalized !== 'EXPIRED'
  ) {
    return { color: 'error', label: t('risk.tag') };
  }
  return resolveQuoteStatusTag(row.status);
}

export const statusTagOptions = () => [
  { color: 'default', label: t('status.DRAFT'), value: 'DRAFT' },
  {
    className: QUOTE_PENDING_APPROVAL_TAG_CLASS,
    color: 'warning',
    label: t('status.PENDING_APPROVAL'),
    value: 'PENDING_APPROVAL',
  },
  { color: 'blue', label: t('status.SENT'), value: 'SENT' },
  { color: 'success', label: t('status.WON'), value: 'WON' },
  { color: 'warning', label: t('status.REJECTED'), value: 'REJECTED' },
  { color: 'warning', label: t('status.EXPIRED'), value: 'EXPIRED' },
  { color: 'error', label: t('status.VOIDED'), value: 'VOIDED' },
  {
    className: QUOTE_REVISING_TAG_CLASS,
    color: 'purple',
    label: t('status.REVISING'),
    value: 'REVISING',
  },
  {
    className: QUOTE_SUPERSEDED_TAG_CLASS,
    color: 'geekblue',
    label: t('status.SUPERSEDED'),
    value: 'SUPERSEDED',
  },
  // 兼容旧数据展示
  {
    className: QUOTE_PENDING_APPROVAL_TAG_CLASS,
    color: 'warning',
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

function serviceTypeLabel(
  value?: Array<QuoteServiceType | string> | QuoteServiceType | string,
) {
  if (value === undefined || value === null || value === '') {
    return '';
  }
  const values = Array.isArray(value) ? value : [value];
  return values
    .map((item) => {
      const option = getServiceTypeOptions().find((opt) => opt.value === item);
      return option?.label ?? item;
    })
    .filter(Boolean)
    .join('、');
}

export { serviceTypeLabel, transportModeLabel };

export function quoteRowClassName({ row }: { row: QuoteApi.QuoteListItem }) {
  if (row.voided) {
    return 'quote-row-voided';
  }
  const status = normalizeQuoteStatus(row.status);
  if (
    row.costRiskActive &&
    status !== 'VOIDED' &&
    status !== 'WON' &&
    status !== 'REVISING' &&
    status !== 'SUPERSEDED' &&
    status !== 'EXPIRED'
  ) {
    return 'quote-row-risk';
  }
  if (row.expired) {
    return 'quote-row-expired';
  }
  return '';
}

export function useQuoteColumns(
  onActionClick: OnActionClickFn<QuoteApi.QuoteListItem>,
  canDelete: boolean,
  canVoid: boolean,
  canOperateRow: (row: QuoteApi.QuoteListItem) => boolean = () => true,
): VxeTableGridOptions<QuoteApi.QuoteListItem>['columns'] {
  const operationOptions: Array<Record<string, any> | string> = [
    { code: 'view', text: t('actions.view') },
  ];
  if (canVoid) {
    operationOptions.push({
      code: 'void',
      danger: true,
      show: (row: QuoteApi.QuoteListItem) =>
        canOperateRow(row) &&
        canShowQuoteVoid(row.status) &&
        !row.costRiskActive,
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

  const operationColumn = buildOperationColumn(true, onActionClick, {
    nameField: 'quoteNo',
    nameTitle: 'QUOTE NO',
    operationOptions,
  });

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
      field: 'serviceTypes',
      fixed: 'left',
      formatter: ({ row }: { row: QuoteApi.QuoteListItem }) =>
        serviceTypeLabel(row.serviceTypes),
      minWidth: 120,
      showOverflow: true,
      title: t('fields.serviceType'),
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
      field: 'status',
      fixed: 'right',
      slots: { default: 'status' },
      title: '状态',
      width: 108,
    },
  ];

  if (operationColumn) {
    operationColumn.minWidth = 140;
    operationColumn.width = 140;
    operationColumn.fixed = 'right';
    columns.push(operationColumn);
  }

  return columns;
}

export function formatQuoteAmount(quantity: number, unitPrice: number) {
  return Number((quantity * unitPrice).toFixed(2));
}
