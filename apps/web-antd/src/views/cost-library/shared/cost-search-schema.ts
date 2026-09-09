import type { VbenFormSchema } from '#/adapter/form';
import type { CostMode } from '#/api/cost';

import { useFumigationSearchSchema } from '../fumigation/data';
import { useRoadSearchSchema } from '../road/data';
import { useSeaSearchSchema } from '../sea/data';
import { createHighlightOnlySearchField } from './highlight-only-search';

/** 与三个成本库列表页相同的搜索栏字段与顺序 */
export function getCostSearchSchema(mode: CostMode): VbenFormSchema[] {
  const highlightField = createHighlightOnlySearchField();
  if (mode === 'road') {
    return [...useRoadSearchSchema(), highlightField];
  }
  if (mode === 'fumigation') {
    return [...useFumigationSearchSchema(), highlightField];
  }
  return [...useSeaSearchSchema(), highlightField];
}

/** 与成本库列表页相同的表格样式 class */
export function getCostGridClass(mode: CostMode): string {
  if (mode === 'road') {
    return 'cost-library-grid road-cost-grid';
  }
  if (mode === 'fumigation') {
    return 'cost-library-grid fumigation-cost-grid';
  }
  return 'cost-library-grid';
}
