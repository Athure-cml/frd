import type { QuoteApi } from '#/api/quote';

/** 列表/导出列定义 — 表头英文与业务 Excel 一致 */
export const QUOTE_SHEET_COLUMNS: Array<{
  field: keyof QuoteApi.QuoteSheetFields;
  title: string;
  width?: number;
}> = [
  { field: 'zipCode', title: 'Zip code', width: 100 },
  { field: 'city', title: 'City', width: 120 },
  { field: 'state', title: 'State', width: 72 },
  { field: 'por', title: 'POR', width: 100 },
  { field: 'pol', title: 'POL', width: 100 },
  { field: 'pod', title: 'POD', width: 88 },
  { field: 'ofUsd', title: 'O/F (USD)', width: 120 },
  { field: 'ssl', title: 'SSL', width: 120 },
  { field: 'truckingNonOakUsd', title: 'TRUCKING NON OAK (USD)', width: 180 },
  { field: 'truckingOakUsd', title: 'TRUCKING OAK (USD)', width: 160 },
  { field: 'fmNonOak', title: 'FM NON OAK', width: 110 },
  { field: 'fmOak', title: 'FM OAK', width: 100 },
  { field: 'docUsd', title: 'DOC (USD)', width: 100 },
  { field: 'cargoMaxWeightTon', title: 'CARGO Max weight (ton)', width: 170 },
  { field: 'sheetRemark', title: 'REMARK', width: 200 },
];

export const QUOTE_ROUTE_KEY_FIELDS = QUOTE_SHEET_COLUMNS.slice(3, 6);

export function sheetCellValue(
  sheet: QuoteApi.QuoteSheetFields | undefined,
  field: keyof QuoteApi.QuoteSheetFields,
) {
  const value = sheet?.[field];
  if (value === null || value === undefined || value === '') {
    return '—';
  }
  return String(value);
}
