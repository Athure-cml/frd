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
