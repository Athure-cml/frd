import type { CostQueryForm, CostRecord } from '../types';

interface PageQuery {
  currentPage: number;
  pageSize: number;
}

export function queryLocalCosts(
  source: CostRecord[],
  page: PageQuery,
  filters: CostQueryForm = {},
) {
  const keywordMatch = (value: string, keyword?: string) => {
    if (!keyword?.trim()) {
      return true;
    }
    return value.toLowerCase().includes(keyword.trim().toLowerCase());
  };

  const filtered = source.filter((item) => {
    return (
      keywordMatch(item.origin, filters.origin) &&
      keywordMatch(item.destination, filters.destination) &&
      keywordMatch(item.carrier, filters.carrier) &&
      (!filters.status || item.status === filters.status)
    );
  });

  const start = (page.currentPage - 1) * page.pageSize;

  return {
    items: filtered.slice(start, start + page.pageSize),
    total: filtered.length,
  };
}
