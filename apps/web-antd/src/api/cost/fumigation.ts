import type { Recordable } from '@vben/types';

import type {
  CostBatchUpdatePayload,
  CostImportResult,
  FumigationCostRecord,
  FumigationCostSave,
  PageResult,
} from './types';

import { requestClient } from '#/api/request';

const base = '/cost-library/fumigation';

export const fumigationCostApi = {
  batchDelete(ids: number[]) {
    return requestClient.post(`${base}/batch-delete`, { ids });
  },
  batchUpdate(data: CostBatchUpdatePayload) {
    return requestClient.patch<{ updated: number }>(`${base}/batch`, data);
  },
  create(data: FumigationCostSave) {
    return requestClient.post<FumigationCostRecord>(base, data);
  },
  delete(id: number) {
    return requestClient.delete(`${base}/${id}`);
  },
  export(params: Recordable<any>) {
    return requestClient.download(`${base}/export`, { params });
  },
  import(file: File) {
    return requestClient.upload<CostImportResult>(`${base}/import`, { file });
  },
  list(params: Recordable<any>) {
    return requestClient.get<PageResult<FumigationCostRecord>>(base, {
      params,
    });
  },
  get(id: number) {
    return requestClient.get<FumigationCostRecord>(`${base}/${id}`);
  },
  update(id: number, data: FumigationCostSave) {
    return requestClient.put<FumigationCostRecord>(`${base}/${id}`, data);
  },
};
