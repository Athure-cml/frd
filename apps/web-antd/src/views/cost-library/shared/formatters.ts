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

/** 表格展示：只显示月-日；无法解析时原样返回 */
export function formatDateMd(value: null | number | string | undefined) {
  if (value === null || value === undefined || value === '') {
    return '';
  }
  const text = String(value).trim();
  const match = text.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (!match) {
    return text;
  }
  const month = (match[2] ?? '').padStart(2, '0');
  const day = (match[3] ?? '').padStart(2, '0');
  return `${month}-${day}`;
}
