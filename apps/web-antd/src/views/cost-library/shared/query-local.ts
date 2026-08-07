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
  const keywordMatch = (value: string | undefined, keyword?: string) => {
    if (!keyword?.trim()) {
      return true;
    }
    return (value ?? '').toLowerCase().includes(keyword.trim().toLowerCase());
  };

  const filtered = source.filter((item) => {
    const row = item as Record<string, unknown>;
    return (
      keywordMatch(String(row.por ?? ''), filters.por) &&
      keywordMatch(
        String(row.pol ?? row.origin ?? ''),
        filters.pol ?? filters.origin,
      ) &&
      keywordMatch(
        String(row.pod ?? row.destination ?? ''),
        filters.pod ?? filters.destination,
      ) &&
      keywordMatch(
        String(row.supplier ?? row.ssl ?? row.carrier ?? ''),
        filters.supplier ?? filters.ssl ?? filters.carrier,
      )
    );
  });

  const start = (page.currentPage - 1) * page.pageSize;

  return {
    items: filtered.slice(start, start + page.pageSize),
    total: filtered.length,
  };
}
