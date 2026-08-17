import type { Recordable } from '@vben/types';

import type {
  CostBatchUpdatePayload,
  CostImportResult,
  PageResult,
  RoadCostRecord,
  RoadCostSave,
} from './types';

import { requestClient } from '#/api/request';

const BASE = '/cost-library/road';

export async function getRoadCostList(params: Recordable<any>) {
  return requestClient.get<PageResult<RoadCostRecord>>(BASE, { params });
}

export async function getRoadCost(id: number) {
  return requestClient.get<RoadCostRecord>(`${BASE}/${id}`);
}

export async function createRoadCost(data: RoadCostSave) {
  return requestClient.post<RoadCostRecord>(BASE, data);
}

/** 续期：新建新价，并把源行有效期写成新生效期 − 1 天 */
export async function renewRoadCost(sourceId: number, data: RoadCostSave) {
  return requestClient.post<RoadCostRecord>(`${BASE}/renew`, {
    record: data,
    sourceId,
  });
}

export async function updateRoadCost(id: number, data: RoadCostSave) {
  return requestClient.put<RoadCostRecord>(`${BASE}/${id}`, data);
}

export async function deleteRoadCost(id: number) {
  return requestClient.delete(`${BASE}/${id}`);
}

export async function batchDeleteRoadCost(ids: number[]) {
  return requestClient.post(`${BASE}/batch-delete`, { ids });
}

export async function batchUpdateRoadCost(data: CostBatchUpdatePayload) {
  return requestClient.patch<{ updated: number }>(`${BASE}/batch`, data);
}

export async function batchCopyRoadCost(data: {
  applyOverrides?: boolean;
  fsc?: number;
  ids: number[];
  validDate?: string;
}) {
  return requestClient.post<{ created: number }>(`${BASE}/batch-copy`, data);
}

export async function importRoadCost(
  file: File,
  templateId?: number,
  dryRun?: boolean,
) {
  return requestClient.upload<CostImportResult>(`${BASE}/import`, {
    file,
    ...(typeof templateId === 'number' ? { templateId } : {}),
    ...(dryRun ? { dryRun: true } : {}),
  });
}

export async function exportRoadCost(params: Recordable<any>) {
  return requestClient.download(`${BASE}/export`, { params });
}
