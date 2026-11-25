import type { VbenFormSchema } from '#/adapter/form';
import type { OnActionClickFn, VxeTableGridOptions } from '#/adapter/vxe-table';
import type { QuoteApi, QuoteServiceType } from '#/api/quote';

import { reactive } from 'vue';

import { useDebounceFn } from '@vueuse/core';

import { getCustomerList } from '#/api/customer';
import { getUsStateList } from '#/api/master-data/us-state';
import { searchDestCityNameOptions } from '#/api/master-data/us-state-zip';
import { getFumigationStationList, lookupQuoteZip } from '#/api/quote';
import { getUserList } from '#/api/system/user';
import { $t } from '#/locales';

import { createTruckSupplierSearchProps } from '../../cost-library/road/truck-supplier-cache';
import { createPortSearchSelectProps } from '../../cost-library/shared/freight-schema';
import MultiPasteSelect from '../../cost-library/shared/multi-paste-select.vue';
import { buildOperationColumn } from '../../system/shared/columns';
import {
  canShowQuoteRenew,
  canShowQuoteVoid,
  isQuoteStatusAbnormal,
  normalizeQuoteStatus,
} from '../shared/quote-status';
import {
  formatQuoteListCellValue,
  QUOTE_LIST_COLUMNS,
} from '../shared/sheet-columns';

const t = (key: string) => $t(`page.quote.${key}`);

function createZipMultiSearchProps() {
  const params = reactive({ keyword: '' });
  const setKeyword = useDebounceFn((keyword: string) => {
    params.keyword = keyword.trim();
  }, 280);
  return {
    allowClear: true,
    api: async (p: { keyword?: string }) => {
      const keyword = p?.keyword?.trim() ?? '';
      if (!keyword) {
        return [];
      }
      const rows = await lookupQuoteZip(keyword, 30);
      return rows.map((row) => ({
        label: `${row.zipCode} · ${row.city}, ${row.stateCode}`,
        value: row.zipCode,
      }));
    },
    class: 'w-full cost-select-multiple-wrap',
    filterOption: false,
    immediate: false,
    maxTagCount: 'responsive' as const,
    mode: 'tags' as const,
    onSearch: setKeyword,
    optionFilterProp: 'label',
    params,
    showSearch: true,
  };
}

function createCityMultiSearchProps() {
  const params = reactive({ keyword: '' });
  const setKeyword = useDebounceFn((keyword: string) => {
    params.keyword = keyword.trim();
  }, 280);
  return {
    allowClear: true,
    api: async (p: { keyword?: string }) => {
      const keyword = p?.keyword?.trim() || '';
      if (!keyword) {
        return [];
      }
      return searchDestCityNameOptions({
        keyword,
        limit: 50,
      });
    },
    class: 'w-full cost-select-multiple-wrap',
    filterOption: false,
    immediate: false,
    maxTagCount: 'responsive' as const,
    mode: 'tags' as const,
    onSearch: setKeyword,
    optionFilterProp: 'label',
    params,
    showSearch: true,
  };
}

function stateFilterOption(
  input: string,
  option?: { label?: string; value?: string },
) {
  const keyword = input.trim().toLowerCase();
  if (!keyword) {
    return true;
  }
  const label = String(option?.label ?? '').toLowerCase();
  const value = String(option?.value ?? '').toLowerCase();
  return label.includes(keyword) || value.includes(keyword);
}

function createStateMultiSearchProps() {
  return {
    allowClear: true,
    api: async () => {
      const states = await getUsStateList();
      return states.map((state) => ({
        label: `${state.code} · ${state.nameZh}`,
        value: state.code,
      }));
    },
    class: 'w-full cost-select-multiple-wrap',
    filterOption: stateFilterOption,
    maxTagCount: 'responsive' as const,
    mode: 'tags' as const,
    optionFilterProp: 'label',
    showSearch: true,
  };
}

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
    { label: t('serviceType.TRANSLOAD'), value: 'TRANSLOAD' },
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
/** 已归档：灰色 */
export const QUOTE_SUPERSEDED_TAG_CLASS = 'quote-status-tag--superseded';

export function resolveQuoteStatusTag(
  status: QuoteApi.QuoteListItem['status'],
  options?: {
    archiveReason?: QuoteApi.QuoteListItem['archiveReason'];
    costRiskActive?: boolean;
  },
) {
  const normalized = normalizeQuoteStatus(status);
  const matched = statusTagOptions().find((item) => item.value === normalized);
  const abnormal = isQuoteStatusAbnormal(status, options?.costRiskActive);
  let label = matched?.label ?? status;
  if (abnormal) {
    label =
      normalized === 'QUOTED'
        ? t('status.QUOTED_ABNORMAL')
        : t('status.PENDING_QUOTE_ABNORMAL');
  } else if (normalized === 'ARCHIVED') {
    const archiveReason =
      options?.archiveReason ??
      (status === 'REVISING' || status === 'SUPERSEDED'
        ? 'SUPERSEDED'
        : undefined);
    if (archiveReason) {
      const reasonKey = `status.ARCHIVED_${archiveReason}`;
      const reasonLabel = t(reasonKey);
      // 缺文案时退回「已归档」
      label = reasonLabel === reasonKey ? t('status.ARCHIVED') : reasonLabel;
    }
  }
  return {
    className: matched?.className,
    color: abnormal ? 'error' : (matched?.color ?? 'default'),
    label,
  };
}

/** 列表统一「已归档」；具体归档原因仅详情页通过 resolveQuoteStatusTag(..., archiveReason) 展示 */
export function resolveQuoteListStatusTag(row: QuoteApi.QuoteListItem) {
  return resolveQuoteStatusTag(row.status, {
    costRiskActive: row.costRiskActive === true,
  });
}

/** @deprecated 异常已并入状态文案，不再单独展示成本风险标签 */
export function shouldShowQuoteListCostRiskTag(_row: QuoteApi.QuoteListItem) {
  return false;
}

/** 对外四态：标签展示与状态搜索共用（旧枚举经 normalizeQuoteStatus 归一后再匹配） */
export const statusTagOptions = () => [
  {
    className: QUOTE_PENDING_APPROVAL_TAG_CLASS,
    color: 'warning',
    label: t('status.PENDING_QUOTE'),
    value: 'PENDING_QUOTE',
  },
  { color: 'blue', label: t('status.QUOTED'), value: 'QUOTED' },
  { color: 'error', label: t('status.VOIDED'), value: 'VOIDED' },
  {
    className: QUOTE_SUPERSEDED_TAG_CLASS,
    color: 'default',
    label: t('status.ARCHIVED'),
    value: 'ARCHIVED',
  },
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
      component: MultiPasteSelect,
      componentProps: {
        allowClear: true,
        api: async () => {
          const result = await getCustomerList({
            page: 1,
            pageSize: 200,
            status: 1,
          });
          return result.items.map((item) => ({
            label: item.name,
            value: item.name,
          }));
        },
        class: 'w-full cost-select-multiple-wrap',
        maxTagCount: 'responsive',
        mode: 'tags',
        optionFilterProp: 'label',
        showSearch: true,
      },
      fieldName: 'customerName',
      label: 'CLIENT',
    },
    {
      component: MultiPasteSelect,
      componentProps: createPortSearchSelectProps([...QUOTE_PORT_TYPES]),
      fieldName: 'por',
      label: 'POR',
    },
    {
      component: MultiPasteSelect,
      componentProps: createPortSearchSelectProps([...QUOTE_PORT_TYPES]),
      fieldName: 'pol',
      label: 'POL',
    },
    {
      component: MultiPasteSelect,
      componentProps: createPortSearchSelectProps([...QUOTE_PORT_TYPES]),
      fieldName: 'pod',
      label: 'POD',
    },
    {
      component: MultiPasteSelect,
      componentProps: createZipMultiSearchProps(),
      fieldName: 'zipCode',
      label: 'ZIP CODE',
    },
    {
      component: MultiPasteSelect,
      componentProps: createStateMultiSearchProps(),
      fieldName: 'state',
      label: 'STATE',
    },
    {
      component: MultiPasteSelect,
      componentProps: createCityMultiSearchProps(),
      fieldName: 'city',
      label: 'CITY',
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
      component: MultiPasteSelect,
      componentProps: {
        allowClear: true,
        api: async () => {
          const stations = await getFumigationStationList();
          return stations.map((item) => ({ label: item, value: item }));
        },
        class: 'w-full cost-select-multiple-wrap',
        maxTagCount: 'responsive',
        mode: 'tags',
        optionFilterProp: 'label',
        showSearch: true,
      },
      fieldName: 'fumigationPoint',
      label: 'STATION',
    },
    {
      component: MultiPasteSelect,
      componentProps: createTruckSupplierSearchProps(),
      fieldName: 'supplier',
      label: 'SUPPLIER',
    },
    {
      component: 'Select',
      componentProps: {
        allowClear: true,
        class: 'w-full cost-select-multiple-wrap',
        maxTagCount: 'responsive',
        mode: 'multiple',
        options: statusTagOptions(),
        optionFilterProp: 'label',
        showSearch: true,
      },
      fieldName: 'status',
      label: t('fields.status'),
    },
    {
      component: MultiPasteSelect,
      componentProps: {
        allowClear: true,
        api: async () => {
          const result = await getUserList({
            page: 1,
            pageSize: 500,
            status: 1,
          });
          return result.items.map((user) => ({
            label: user.realName,
            value: user.id,
          }));
        },
        class: 'w-full cost-select-multiple-wrap',
        maxTagCount: 'responsive',
        mode: 'multiple',
        optionFilterProp: 'label',
        showSearch: true,
      },
      fieldName: 'createdBy',
      label: t('fields.operator'),
    },
    {
      component: 'DatePicker',
      componentProps: {
        allowClear: true,
        class: 'w-full',
        valueFormat: 'YYYY-MM-DD',
      },
      fieldName: 'validUntil',
      label: 'VALID UNTIL',
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
  canCreate = false,
): VxeTableGridOptions<QuoteApi.QuoteListItem>['columns'] {
  const operationOptions: Array<Record<string, any> | string> = [
    { code: 'view', text: t('actions.view') },
  ];
  if (canCreate) {
    operationOptions.push({
      code: 'renew',
      show: (row: QuoteApi.QuoteListItem) =>
        canShowQuoteRenew(row.status, {
          archiveReason: row.archiveReason,
          expired: row.expired,
        }),
      text: t('actions.renew'),
    });
  }
  // 待报价可作废（取代退回）；已报价无作废入口
  if (canVoid || canDelete) {
    operationOptions.push({
      code: 'void',
      danger: true,
      show: (row: QuoteApi.QuoteListItem) =>
        canOperateRow(row) && canShowQuoteVoid(row.status),
      text: t('actions.void'),
    });
  }

  const operationColumn = buildOperationColumn(true, onActionClick, {
    nameField: 'quoteNo',
    nameTitle: 'QUOTE NO',
    operationOptions,
  });

  const sheetCols = QUOTE_LIST_COLUMNS.map((col) => {
    const width = col.width ?? 100;
    return {
      field:
        col.listSource === 'row' ? col.field : `sheet.${String(col.field)}`,
      formatter: ({ row }: { row: QuoteApi.QuoteListItem }) =>
        formatQuoteListCellValue(row, col),
      // 同时给 width + minWidth，避免仅 minWidth 时 recalculate 把列撑满容器导致横向滚动条消失
      minWidth: width,
      showOverflow: true,
      title: col.title,
      width,
    };
  });

  const columns: VxeTableGridOptions<QuoteApi.QuoteListItem>['columns'] = [
    { type: 'checkbox', width: 48, fixed: 'left' },
    {
      field: 'quoteNo',
      fixed: 'left',
      minWidth: 130,
      slots: { default: 'quoteNo' },
      title: 'QUOTE NO',
      width: 130,
    },
    {
      field: 'createdByName',
      fixed: 'left',
      minWidth: 100,
      showOverflow: true,
      title: t('fields.operator'),
      width: 100,
    },
    {
      field: 'serviceTypes',
      fixed: 'left',
      formatter: ({ row }: { row: QuoteApi.QuoteListItem }) =>
        serviceTypeLabel(row.serviceTypes),
      minWidth: 120,
      showOverflow: true,
      title: t('fields.serviceType'),
      width: 120,
    },
    {
      field: 'customerName',
      fixed: 'left',
      minWidth: 120,
      title: 'CLIENT',
      width: 120,
    },
    ...sheetCols,
    {
      align: 'center',
      field: 'status',
      fixed: 'right',
      slots: { default: 'status' },
      title: '状态',
      // 容纳「已报价（异常）」等较长文案，避免 Tag 被裁切
      width: 140,
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
