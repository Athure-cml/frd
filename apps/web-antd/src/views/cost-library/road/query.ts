import type { RoadCostQueryForm, RoadCostRecord } from './types';

interface PageQuery {
  currentPage: number;
  pageSize: number;
}

export function queryRoadCosts(
  source: RoadCostRecord[],
  page: PageQuery,
  filters: RoadCostQueryForm = {},
) {
  const keywordMatch = (value: string, keyword?: string) => {
    if (!keyword?.trim()) {
      return true;
    }
    return value.toLowerCase().includes(keyword.trim().toLowerCase());
  };

  const filtered = source.filter((item) => {
    return (
      keywordMatch(item.supplier, filters.supplier) &&
      keywordMatch(item.zipCode ?? '', filters.zipCode) &&
      keywordMatch(item.city, filters.city) &&
      keywordMatch(item.state, filters.state) &&
      keywordMatch(item.pol, filters.pol)
    );
  });

  const start = (page.currentPage - 1) * page.pageSize;

  return {
    items: filtered.slice(start, start + page.pageSize),
    total: filtered.length,
  };
}
