/**
 * 海运搜索栏多选字段 → 后端查询参数。
 *
 * 前端多选值为数组，后端按「|」分隔解析成正则做 OR 包含匹配（SearchText.toRegex）；
 * 港口名/供应商名常含逗号，不能用逗号拼接。
 */
const SEA_MULTI_SEARCH_FIELDS = [
  'por',
  'pol',
  'pod',
  'containerType',
  'ssl',
  'agent',
] as const;

export const SEA_MULTI_SEARCH_DELIMITER = '|';

export function joinMultiSearchValue(value: unknown): string | undefined {
  if (Array.isArray(value)) {
    const joined = value
      .map((item) => String(item ?? '').trim())
      .filter(Boolean)
      .join(SEA_MULTI_SEARCH_DELIMITER);
    return joined || undefined;
  }
  if (typeof value === 'string') {
    return value.trim() || undefined;
  }
  return undefined;
}

/** 就地把海运多选字段数组转成「A|B」字符串，空值删除 */
export function normalizeSeaMultiSearchParams(
  params: Record<string, unknown>,
): Record<string, unknown> {
  return normalizePipeSearchParams(params, SEA_MULTI_SEARCH_FIELDS);
}

/** 卡车搜索栏多选字段（后端 SearchText.toRegex 按「|」拆分做 OR 匹配） */
export const ROAD_MULTI_SEARCH_FIELDS = ['zipCode', 'state', 'por'] as const;

/** 熏蒸搜索栏多选字段 */
export const FUMIGATION_MULTI_SEARCH_FIELDS = ['region', 'station'] as const;

/** 就地把指定字段的多选数组转成「A|B」字符串，空值删除 */
export function normalizePipeSearchParams(
  params: Record<string, unknown>,
  fields: readonly string[],
): Record<string, unknown> {
  for (const field of fields) {
    if (!(field in params)) {
      continue;
    }
    const joined = joinMultiSearchValue(params[field]);
    if (joined) {
      params[field] = joined;
    } else {
      Reflect.deleteProperty(params, field);
    }
  }
  return params;
}
