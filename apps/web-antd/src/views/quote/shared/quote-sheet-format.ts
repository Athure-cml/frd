import type { QuoteApi } from '#/api/quote';

/** 金额字段展示：纯数字，不含 US$ 前缀（所有费用均为美元） */
export function formatUsdAmount(value?: null | number | string) {
  return normalizeUsdFieldValue(value);
}

/** 去掉 US$ / 千分位，公式占位（如 CIF*…）原样保留 */
export function normalizeUsdFieldValue(value?: null | number | string) {
  if (value === null || value === undefined || value === '') {
    return '';
  }
  const text = String(value).trim();
  if (!text) {
    return '';
  }
  if (/CIF/i.test(text)) {
    return text;
  }
  const num = parseUsdNumber(text);
  if (num === undefined) {
    return text.replaceAll(/US\$/gi, '').replaceAll(',', '').trim();
  }
  return num.toFixed(2);
}

export function parseUsdNumber(value?: null | number | string) {
  if (value === null || value === undefined || value === '') {
    return undefined;
  }
  const text = String(value)
    .replaceAll(/US\$/gi, '')
    .replaceAll(',', '')
    .trim();
  if (!text) {
    return undefined;
  }
  const num = Number(text);
  return Number.isNaN(num) ? undefined : num;
}

/** 报价单日期：系统当日，格式 yyyy-MM-dd */
export function todayQuoteDate() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export type FmSelection = 'none' | 'nonOak' | 'oak';

export function fmSelectionFromSheet(
  sheet: QuoteApi.QuoteSheetFields,
): FmSelection {
  if (sheet.fmOak && Number(sheet.fmOak) > 0) {
    return 'oak';
  }
  if (sheet.fmNonOak && Number(sheet.fmNonOak) > 0) {
    return 'nonOak';
  }
  return 'none';
}

export function applyFmSelection(
  sheet: QuoteApi.QuoteSheetFields,
  selection: FmSelection,
) {
  if (selection === 'nonOak') {
    sheet.fmOak = 0;
    return;
  }
  if (selection === 'oak') {
    sheet.fmNonOak = 0;
    return;
  }
  sheet.fmNonOak = 0;
  sheet.fmOak = 0;
}

export function formatPorPolDisplay(sheet: QuoteApi.QuoteSheetFields) {
  const por = sheet.por?.trim();
  const pol = sheet.pol?.trim();
  if (por && pol && por !== pol) {
    return `${por} / ${pol}`;
  }
  return por || pol || '';
}
