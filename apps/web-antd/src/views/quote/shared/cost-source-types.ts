import type { QuoteCostType, QuoteServiceType } from '#/api/quote';

const ALL_COST_TYPES: QuoteCostType[] = ['SEA', 'ROAD', 'FUMIGATION'];

/** 服务类型 → 数据来源报价库类型（卡车→ROAD）；顺序：海运 → 卡车 → 熏蒸 */
export function resolveCostSourceTypes(
  serviceTypes?: null | QuoteServiceType[] | string[],
): QuoteCostType[] {
  const selected = serviceTypes ? new Set(serviceTypes) : new Set();
  const types: QuoteCostType[] = [];
  if (selected.has('SEA')) {
    types.push('SEA');
  }
  if (selected.has('TRUCK')) {
    types.push('ROAD');
  }
  if (selected.has('FUMIGATION')) {
    types.push('FUMIGATION');
  }
  return types;
}

/** 保持 SEA → ROAD → FUMIGATION 固定顺序 */
export function orderCostSourceTypes(
  types?: null | QuoteCostType[],
): QuoteCostType[] {
  if (!types || types.length === 0) {
    return [];
  }
  const allowed = new Set(types);
  return ALL_COST_TYPES.filter((type) => allowed.has(type));
}
