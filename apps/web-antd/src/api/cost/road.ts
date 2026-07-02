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

export async function importRoadCost(file: File) {
  return requestClient.upload<CostImportResult>(`${BASE}/import`, { file });
}

export async function exportRoadCost(params: Recordable<any>) {
  return requestClient.download(`${BASE}/export`, { params });
}
