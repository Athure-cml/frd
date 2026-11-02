import type { VbenFormSchema } from '#/adapter/form';

import { useFumigationSearchSchema } from '../../../cost-library/fumigation/data';
import { useRoadSearchSchema } from '../../../cost-library/road/data';
import { useSeaSearchSchema } from '../../../cost-library/sea/data';
import { createHighlightOnlySearchField } from '../../../cost-library/shared/highlight-only-search';
import { createQuoteLibraryStatusSearchField } from '../../../cost-library/shared/status-search';

/** 报价库搜索：状态筛选项含「待确认」，替换成本库通用状态字段；并带「仅看常用」 */
function withQuoteLibrarySearchExtras(
  schema: VbenFormSchema[],
  statusDefault?: string[],
): VbenFormSchema[] {
  const statusField = createQuoteLibraryStatusSearchField(statusDefault);
  const highlightField = createHighlightOnlySearchField();
  const statusIndex = schema.findIndex((item) => item.fieldName === 'status');
  let next = [...schema];
  if (statusIndex === -1) {
    next = [...next, statusField];
  } else {
    next[statusIndex] = statusField;
  }
  if (!next.some((item) => item.fieldName === 'highlightOnly')) {
    next = [...next, highlightField];
  }
  return next;
}

/** 卡车报价库默认：待确认 + 生效中 */
export function useQuoteLibraryRoadSearchSchema(): VbenFormSchema[] {
  return withQuoteLibrarySearchExtras(useRoadSearchSchema(), [
    'pendingConfirm',
    'active',
  ]);
}

export function useQuoteLibrarySeaSearchSchema(): VbenFormSchema[] {
  return withQuoteLibrarySearchExtras(useSeaSearchSchema());
}

export function useQuoteLibraryFumigationSearchSchema(): VbenFormSchema[] {
  return withQuoteLibrarySearchExtras(useFumigationSearchSchema());
}
