import {
  joinMultiSearchValue,
  normalizePipeSearchParams,
} from '../../cost-library/shared/multi-search-params';

/** 报价单列表搜索：多选字段（后端 SearchText.toRegex / RequestIds.parseMulti） */
export const QUOTE_LIST_MULTI_SEARCH_FIELDS = [
  'customerName',
  'por',
  'pol',
  'pod',
  'zipCode',
  'state',
  'city',
  'fumigationPoint',
  'supplier',
  'status',
  'createdBy',
] as const;

/** 就地把多选数组转成「A|B」字符串，空值删除；VALID UNTIL 单日 → 查该日及以前 */
export function normalizeQuoteListSearchParams(
  params: Record<string, unknown>,
): Record<string, unknown> {
  const next = normalizePipeSearchParams(
    params,
    QUOTE_LIST_MULTI_SEARCH_FIELDS,
  );
  const validUntil = next.validUntil;
  delete next.validUntil;
  delete next.validUntilFrom;
  if (typeof validUntil === 'string' && validUntil.trim()) {
    next.validUntilTo = validUntil.trim();
  }
  return next;
}

export { joinMultiSearchValue };
