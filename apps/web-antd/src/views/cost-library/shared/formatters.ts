import type { CostStatus } from '../types';

import { $t } from '#/locales';

export function formatStatus(status: CostStatus) {
  return $t(`page.costLibrary.status.${status}`);
}

export function formatPrice(
  price: null | number | undefined,
  currency?: null | string,
) {
  if (price === null || price === undefined) {
    return '—';
  }
  const symbol = currency === 'CNY' ? '¥' : '$';
  return `${symbol}${price.toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatUsd(price: number) {
  return formatPrice(price, 'USD');
}

function formatSingleCostDate(text: string): null | string {
  const isoMatch = text.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (isoMatch) {
    const year = isoMatch[1];
    const month = (isoMatch[2] ?? '').padStart(2, '0');
    const day = (isoMatch[3] ?? '').padStart(2, '0');
    return `${year}/${month}/${day}`;
  }

  const usMatch = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (usMatch) {
    let year = Number.parseInt(usMatch[3] ?? '', 10);
    if (Number.isNaN(year)) {
      return null;
    }
    if (year < 100) {
      year += 2000;
    }
    const month = (usMatch[1] ?? '').padStart(2, '0');
    const day = (usMatch[2] ?? '').padStart(2, '0');
    return `${year}/${month}/${day}`;
  }

  return null;
}

/** 成本库表格/导出展示：统一 yyyy/MM/dd；无法解析时原样返回 */
export function formatDateMd(value: null | number | string | undefined) {
  if (value === null || value === undefined || value === '') {
    return '';
  }
  const text = String(value).trim();
  const rangeMatch = text.match(/^(.+?)\s*[-–—~至到]\s*(.+)$/);
  if (rangeMatch) {
    const start = formatSingleCostDate(rangeMatch[1]?.trim() ?? '');
    const end = formatSingleCostDate(rangeMatch[2]?.trim() ?? '');
    if (start && end) {
      return `${start} - ${end}`;
    }
  }
  return formatSingleCostDate(text) ?? text;
}
