import type { QuoteApi } from '#/api/quote';

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
  { field: 'nsLift', title: 'NS LIFT', type: 'money', width: 96 },
  { field: 'chassis', title: 'CHASSIS', type: 'money', width: 96 },
  { field: 'waiting', title: 'WAITING', type: 'money', width: 96 },
  {
    field: 'redeliveryFee',
    title: 'REDELIVERY FEE',
    type: 'money',
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

export function formatQuoteDate(value?: string) {
  if (!value) {
    return '—';
  }
  return value.length >= 10 ? value.slice(0, 10) : value;
}
