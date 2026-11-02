import type { Dayjs } from 'dayjs';

import type { QuoteApi } from '#/api/quote';

import dayjs from 'dayjs';

/** 列表/导出列定义 — 表头与「报价单列表模板.xlsx」一致 */
export const QUOTE_SHEET_COLUMNS: Array<{
  field: 'porPol' | keyof QuoteApi.QuoteSheetFields;
  title: string;
  type?: 'money' | 'text';
  width?: number;
}> = [
  { field: 'pickUpAddress', title: 'PICK UP ADDRESS', width: 180 },
  { field: 'porPol', title: 'POR/POL', width: 120 },
  { field: 'pod', title: 'POD', width: 88 },
  { field: 'oceanFreight', title: 'OCEAN FREIGHT', width: 130 },
  { field: 'truckingFee', title: 'TRUCKING FEE', type: 'money', width: 120 },
  { field: 'truckingFee2', title: 'TRUCKING FEE 2', type: 'money', width: 120 },
  { field: 'nsLift', title: 'NS LIFT', type: 'money', width: 96 },
  { field: 'chassis', title: 'CHASSIS', type: 'money', width: 96 },
  { field: 'waiting', title: 'WAITING', type: 'money', width: 96 },
  {
    field: 'redeliveryFee',
    title: 'REDELIVERY FEE',
    width: 120,
  },
  { field: 'truckRemark', title: 'TRUCK REMARK', width: 160 },
  { field: 'fmNonOak', title: 'FM (NON-OAK)', type: 'money', width: 120 },
  { field: 'fmOak', title: 'FM (OAK)', type: 'money', width: 110 },
  { field: 'docUsd', title: 'DOC FEE', width: 100 },
  {
    field: 'cargoInsurancePremium',
    title: 'CARGO INSURANCE PREMIUM',
    width: 180,
  },
  { field: 'cargoAgentFee', title: 'CARGO AGENT FEE', width: 140 },
  { field: 'sheetRemark', title: 'REMARK', width: 200 },
];

/** 报价单列表页表头（精简列） */
export const QUOTE_LIST_COLUMNS: Array<{
  field:
    | 'oakType'
    | 'porPol'
    | 'quoteDate'
    | 'supplier'
    | 'validUntil'
    | keyof QuoteApi.QuoteSheetFields;
  listSource?: 'row' | 'sheet';
  title: string;
  type?: 'date' | 'money' | 'text';
  width?: number;
}> = [
  { field: 'por', title: 'POR', width: 96 },
  { field: 'pol', title: 'POL', width: 96 },
  { field: 'pod', title: 'POD', width: 96 },
  { field: 'zipCode', title: 'ZIP CODE', width: 100 },
  { field: 'state', title: 'STATE', width: 80 },
  { field: 'city', title: 'CITY', width: 100 },
  {
    field: 'supplier',
    listSource: 'row',
    title: 'SUPPLIER',
    width: 140,
  },
  { field: 'pickUpAddress', title: 'PICK UP ADDRESS', width: 180 },
  { field: 'fumigationPoint', title: 'STATION', width: 120 },
  {
    field: 'oakType',
    listSource: 'row',
    title: 'OAK / NON-OAK',
    width: 128,
  },
  {
    field: 'quoteDate',
    listSource: 'row',
    title: 'DATE',
    type: 'date',
    width: 112,
  },
  {
    field: 'validUntil',
    listSource: 'row',
    title: 'VALID UNTIL',
    type: 'date',
    width: 120,
  },
  { field: 'sheetRemark', title: 'REMARK', width: 200 },
];

export const QUOTE_ROUTE_KEY_FIELDS: Array<{
  field: keyof QuoteApi.QuoteSheetFields;
  title: string;
}> = [
  { field: 'por', title: 'POR' },
  { field: 'pol', title: 'POL' },
  { field: 'pod', title: 'POD' },
];

function formatMoney(value?: null | number) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return '—';
  }
  return Number(value).toFixed(2);
}

function formatPorPol(sheet?: QuoteApi.QuoteSheetFields) {
  const por = sheet?.por?.trim();
  const pol = sheet?.pol?.trim();
  if (por && pol && por !== pol) {
    return `${por}/${pol}`;
  }
  return por || pol || '—';
}

export function sheetCellValue(
  sheet: QuoteApi.QuoteSheetFields | undefined,
  field: 'porPol' | keyof QuoteApi.QuoteSheetFields,
) {
  if (field === 'porPol') {
    return formatPorPol(sheet);
  }
  if (field === 'redeliveryFee') {
    return 'AT COST';
  }
  const col = QUOTE_SHEET_COLUMNS.find((item) => item.field === field);
  const value = sheet?.[field as keyof QuoteApi.QuoteSheetFields];
  if (value === null || value === undefined || value === '') {
    return '—';
  }
  if (col?.type === 'money') {
    return formatMoney(Number(value));
  }
  return String(value);
}

export function formatQuoteListCellValue(
  row: QuoteApi.QuoteListItem,
  col: (typeof QUOTE_LIST_COLUMNS)[number],
) {
  if (col.listSource === 'row') {
    if (col.field === 'oakType') {
      if (row.oakType === 'OAK') {
        return 'OAK';
      }
      if (row.oakType === 'NON_OAK') {
        return 'NON-OAK';
      }
      return '—';
    }
    if (col.field === 'quoteDate') {
      return formatQuoteDate(row.quoteDate ?? row.createdAt);
    }
    if (col.field === 'validUntil') {
      return formatQuoteDate(row.validUntil);
    }
    if (col.field === 'supplier') {
      const value = row.supplier?.trim() || row.sheet?.supplier?.trim();
      return value || '—';
    }
  }
  return sheetCellValue(
    row.sheet,
    col.field as 'porPol' | keyof QuoteApi.QuoteSheetFields,
  );
}

export function formatQuoteDate(value?: string) {
  if (!value) {
    return '—';
  }
  return value.length >= 10 ? value.slice(0, 10) : value;
}

/** 从 yyyy-MM-dd 或带时间的字符串解析报价日期；无效则返回 undefined（不回落到今天） */
export function parseQuoteDate(
  ...candidates: Array<null | string | undefined>
): Dayjs | undefined {
  for (const value of candidates) {
    if (!value) continue;
    const text = value.length >= 10 ? value.slice(0, 10) : value;
    const parsed = dayjs(text);
    if (parsed.isValid()) {
      return parsed;
    }
  }
  return undefined;
}
