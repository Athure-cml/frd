import type { CostMode } from './types';

import { requestClient } from '#/api/request';

const BASE = '/cost-library/highlights';

export async function markCostHighlight(
  mode: CostMode,
  data: { color: string; ids: number[]; remark?: string },
) {
  return requestClient.post<{ updated: number }>(`${BASE}/${mode}`, data);
}

export async function unmarkCostHighlight(mode: CostMode, ids: number[]) {
  return requestClient.delete<{ removed: number }>(`${BASE}/${mode}`, {
    data: { ids },
  });
}
