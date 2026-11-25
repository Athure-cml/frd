import type { VbenFormSchema } from '#/adapter/form';
import type { OnActionClickFn, VxeTableGridOptions } from '#/adapter/vxe-table';
import type { QuoteServiceType } from '#/api/quote';
import type { InquiryApi, InquiryStatus } from '#/api/quote/inquiry';

import { reactive } from 'vue';

import { useDebounceFn } from '@vueuse/core';

import { getCustomerList } from '#/api/customer';
import { getUsStateList } from '#/api/master-data/us-state';
import { searchDestCityNameOptions } from '#/api/master-data/us-state-zip';
import { getFumigationStationList, lookupQuoteZip } from '#/api/quote';
import { getUserList } from '#/api/system/user';
import { $t } from '#/locales';

import { createPortSelectProps } from '../../../cost-library/shared/freight-schema';
import { buildOperationColumn } from '../../../system/shared/columns';
import {
  getServiceTypeOptions,
  QUOTE_SUPERSEDED_TAG_CLASS,
} from '../../list/data';
import {
  formatQuoteDate,
  QUOTE_LIST_COLUMNS,
} from '../../shared/sheet-columns';

const t = (key: string) => $t(`page.inquiry.${key}`);
const qt = (key: string) => $t(`page.quote.${key}`);

const INQUIRY_PORT_TYPES = ['INLAND', 'RAIL', 'SEAPORT'] as const;

/** 询价五态配色：待递交橙 / 待报价蓝 / 已报价绿 / 已作废红 / 已过期灰 */
export const inquiryStatusTagOptions = () => [
  {
    color: 'orange',
    label: t('status.PENDING_SUBMIT'),
    value: 'PENDING_SUBMIT',
  },
  {
    color: 'blue',
    label: t('status.PENDING_QUOTE'),
    value: 'PENDING_QUOTE',
  },
  { color: 'success', label: t('status.QUOTED'), value: 'QUOTED' },
  { color: 'error', label: t('status.VOIDED'), value: 'VOIDED' },
  {
    className: QUOTE_SUPERSEDED_TAG_CLASS,
    color: 'default',
    label: t('status.EXPIRED'),
    value: 'EXPIRED',
  },
];

export function resolveInquiryStatusTag(status: InquiryStatus | string) {
  const matched = inquiryStatusTagOptions().find(
    (item) => item.value === status,
  );
  return {
    className: matched?.className,
    color: matched?.color ?? 'default',
    label: matched?.label ?? status,
  };
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

function formatOakType(value?: string) {
  if (value === 'OAK') return 'OAK';
  if (value === 'NON_OAK') return 'NON-OAK';
  return '—';
}

function formatInquiryListCellValue(
  row: InquiryApi.ListItem,
  col: (typeof QUOTE_LIST_COLUMNS)[number],
) {
  if (col.field === 'oakType') {
    return formatOakType(row.oakType);
  }
  if (col.field === 'quoteDate') {
    return formatQuoteDate(row.quoteDate ?? row.createdAt);
  }
  if (col.field === 'validUntil') {
    return formatQuoteDate(row.validUntil);
  }
  const raw = row[col.field as keyof InquiryApi.ListItem];
  if (raw === null || raw === undefined || raw === '') {
    return '—';
  }
  return String(raw);
}

function createZipSearchProps() {
  const options = reactive<Array<{ label: string; value: string }>>([]);
  const search = useDebounceFn(async (keyword: string) => {
    const q = keyword.trim();
    if (!q) {
      options.splice(0);
      return;
    }
    const rows = await lookupQuoteZip(q, 30);
    options.splice(
      0,
      options.length,
      ...rows.map((row) => ({
        label: `${row.zipCode} · ${row.city}, ${row.stateCode}`,
        value: row.zipCode,
      })),
    );
  }, 280);
  return {
    allowClear: true,
    class: 'w-full',
    filterOption: false,
    options,
    onSearch: search,
  };
}

/** 搜索栏 CITY：允许手输关键字（后端 LIKE）也可从下拉选 */
function createCitySearchProps() {
  const options = reactive<Array<{ label: string; value: string }>>([]);
  const search = useDebounceFn(async (keyword: string) => {
    const q = keyword.trim();
    if (!q) {
      options.splice(0);
      return;
    }
    const rows = await searchDestCityNameOptions({ keyword: q, limit: 50 });
    options.splice(0, options.length, ...rows);
  }, 280);
  return {
    allowClear: true,
    class: 'w-full',
    filterOption: false,
    options,
    onSearch: search,
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

function createStateSearchProps() {
  return {
    allowClear: true,
    api: async () => {
      const states = await getUsStateList();
      return states.map((state) => ({
        label: `${state.code} · ${state.nameZh}`,
        value: state.code,
      }));
    },
    class: 'w-full',
    filterOption: stateFilterOption,
    optionFilterProp: 'label',
    showSearch: true,
  };
}

/** 搜索栏与报价单列表对齐（INQUIRY NO 替代 QUOTE NO） */
export function useInquirySearchSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      componentProps: {
        allowClear: true,
        autocomplete: 'off',
        class: 'w-full',
      },
      fieldName: 'inquiryNo',
      label: 'INQUIRY NO',
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
        portTypes: [...INQUIRY_PORT_TYPES],
        requireKeyword: true,
      }),
      fieldName: 'por',
      label: 'POR',
    },
    {
      component: 'ApiSelect',
      componentProps: createPortSelectProps({
        portTypes: [...INQUIRY_PORT_TYPES],
        requireKeyword: true,
      }),
      fieldName: 'pol',
      label: 'POL',
    },
    {
      component: 'ApiSelect',
      componentProps: createPortSelectProps({
        portTypes: [...INQUIRY_PORT_TYPES],
        requireKeyword: true,
      }),
      fieldName: 'pod',
      label: 'POD',
    },
    {
      component: 'AutoComplete',
      componentProps: createZipSearchProps(),
      fieldName: 'zipCode',
      label: 'ZIP CODE',
    },
    {
      component: 'ApiSelect',
      componentProps: createStateSearchProps(),
      fieldName: 'state',
      label: 'STATE',
    },
    {
      component: 'AutoComplete',
      componentProps: createCitySearchProps(),
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
        options: inquiryStatusTagOptions(),
      },
      fieldName: 'status',
      label: qt('fields.status'),
    },
    {
      component: 'ApiSelect',
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
        class: 'w-full',
        optionFilterProp: 'label',
        showSearch: true,
      },
      fieldName: 'createdBy',
      label: qt('fields.operator'),
    },
  ];
}

export function useInquiryColumns(
  onActionClick: OnActionClickFn<InquiryApi.ListItem>,
  canDelete: boolean,
  canWithdraw = false,
): VxeTableGridOptions<InquiryApi.ListItem>['columns'] {
  const operationOptions: Array<Record<string, any> | string> = [
    { code: 'view', text: $t('page.quote.actions.view') },
  ];
  if (canWithdraw) {
    operationOptions.push({
      code: 'withdraw',
      danger: true,
      show: (row: InquiryApi.ListItem) => row.status === 'PENDING_QUOTE',
      text: $t('page.inquiry.actions.withdraw'),
    });
  }
  if (canDelete) {
    operationOptions.push({
      code: 'delete',
      danger: true,
      show: (row: InquiryApi.ListItem) => row.status === 'PENDING_SUBMIT',
      text: $t('common.delete'),
    });
  }
  const operationColumn = buildOperationColumn(true, onActionClick, {
    nameField: 'inquiryNo',
    nameTitle: 'INQUIRY NO',
    operationOptions,
  });

  // 与报价单列表一致，不含 REMARK
  const sheetCols = QUOTE_LIST_COLUMNS.filter(
    (col) => col.field !== 'sheetRemark',
  ).map((col) => {
    const width = col.width ?? 100;
    return {
      field: col.field,
      formatter: ({ row }: { row: InquiryApi.ListItem }) =>
        formatInquiryListCellValue(row, col),
      minWidth: width,
      showOverflow: true,
      title: col.title,
      width,
    };
  });

  const columns: VxeTableGridOptions<InquiryApi.ListItem>['columns'] = [
    {
      field: 'inquiryNo',
      fixed: 'left',
      minWidth: 130,
      slots: { default: 'inquiryNo' },
      title: 'INQUIRY NO',
      width: 130,
    },
    {
      field: 'createdByName',
      fixed: 'left',
      minWidth: 100,
      showOverflow: true,
      title: qt('fields.operator'),
      width: 100,
    },
    {
      field: 'serviceTypes',
      fixed: 'left',
      formatter: ({ row }: { row: InquiryApi.ListItem }) =>
        serviceTypeLabel(row.serviceTypes),
      minWidth: 120,
      showOverflow: true,
      title: qt('fields.serviceType'),
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
      width: 108,
    },
  ];

  if (operationColumn) {
    operationColumn.minWidth = 180;
    operationColumn.width = 180;
    operationColumn.fixed = 'right';
    columns.push(operationColumn);
  }

  return columns;
}
