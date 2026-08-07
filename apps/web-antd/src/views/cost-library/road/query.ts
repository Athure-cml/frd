import type { RoadCostQueryForm, RoadCostRecord } from './types';

function keywordMatch(value: null | string | undefined, keyword?: string) {
  if (!keyword?.trim()) return true;
  return (value ?? '').toLowerCase().includes(keyword.trim().toLowerCase());
}

export function queryRoadCosts(
  items: RoadCostRecord[],
  filters: RoadCostQueryForm,
) {
  return items.filter(
    (item) =>
      keywordMatch(item.zipCode, filters.zipCode) &&
      keywordMatch(item.city, filters.city) &&
      keywordMatch(item.state, filters.state) &&
      keywordMatch(item.por, filters.por) &&
      keywordMatch(item.pol, filters.pol) &&
      keywordMatch(item.supplier, filters.supplier),
  );
}
