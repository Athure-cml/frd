import type { VbenFormSchema } from '#/adapter/form';

import { useFumigationSearchSchema } from '../../../cost-library/fumigation/data';
import { useRoadSearchSchema } from '../../../cost-library/road/data';
import { useSeaSearchSchema } from '../../../cost-library/sea/data';
import { createQuoteLibraryStatusSearchField } from '../../../cost-library/shared/status-search';

/** 报价库搜索：状态筛选项含「待确认」，替换成本库通用状态字段 */
function withQuoteLibraryStatusSearch(
  schema: VbenFormSchema[],
): VbenFormSchema[] {
  const statusField = createQuoteLibraryStatusSearchField();
  const statusIndex = schema.findIndex((item) => item.fieldName === 'status');
  if (statusIndex === -1) {
    return [...schema, statusField];
  }
  const next = [...schema];
  next[statusIndex] = statusField;
  return next;
}

export function useQuoteLibraryRoadSearchSchema(): VbenFormSchema[] {
  return withQuoteLibraryStatusSearch(useRoadSearchSchema());
}

export function useQuoteLibrarySeaSearchSchema(): VbenFormSchema[] {
  return withQuoteLibraryStatusSearch(useSeaSearchSchema());
}

export function useQuoteLibraryFumigationSearchSchema(): VbenFormSchema[] {
  return withQuoteLibraryStatusSearch(useFumigationSearchSchema());
}
