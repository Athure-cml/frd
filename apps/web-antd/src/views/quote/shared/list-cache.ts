/**
 * 列表 keepAlive 策略辅助：
 * - 有搜索/翻页：返回时保留结果，不强制刷新
 * - 无搜索且第 1 页：返回时刷新，避免看不见新建单据
 * - 详情侧发生写操作：返回时强制刷新（保留当前搜索条件）
 */

const FORCE_REFRESH_KEYS = {
  inquiry: 'quote:inquiry-list:force-refresh',
  quote: 'quote:quote-list:force-refresh',
} as const;

export type QuoteListCacheKind = keyof typeof FORCE_REFRESH_KEYS;

export function markQuoteListForceRefresh(kind: QuoteListCacheKind = 'quote') {
  try {
    sessionStorage.setItem(FORCE_REFRESH_KEYS[kind], '1');
  } catch {
    // ignore
  }
}

export function consumeQuoteListForceRefresh(
  kind: QuoteListCacheKind = 'quote',
) {
  try {
    const key = FORCE_REFRESH_KEYS[kind];
    const hit = sessionStorage.getItem(key) === '1';
    if (hit) {
      sessionStorage.removeItem(key);
    }
    return hit;
  } catch {
    return false;
  }
}

/** 是否存在有效搜索条件（忽略空串/空数组/null） */
export function hasActiveListFilters(values?: null | Record<string, unknown>) {
  if (!values) {
    return false;
  }
  return Object.values(values).some((value) => {
    if (value === null || value === undefined || value === '') {
      return false;
    }
    if (Array.isArray(value)) {
      return value.length > 0;
    }
    return true;
  });
}
