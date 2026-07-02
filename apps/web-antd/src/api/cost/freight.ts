import type { Recordable } from '@vben/types';

import type {
  CostBatchUpdatePayload,
  CostImportResult,
  FreightCostRecord,
  FreightCostSave,
  PageResult,
} from './types';

import { requestClient } from '#/api/request';

function createFreightApi(base: string) {
  return {
    batchDelete(ids: number[]) {
      return requestClient.post(`${base}/batch-delete`, { ids });
    },
    batchUpdate(data: CostBatchUpdatePayload) {
      return requestClient.patch<{ updated: number }>(`${base}/batch`, data);
    },
    create(data: FreightCostSave) {
      return requestClient.post<FreightCostRecord>(base, data);
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
      return requestClient.get<PageResult<FreightCostRecord>>(base, { params });
    },
    get(id: number) {
      return requestClient.get<FreightCostRecord>(`${base}/${id}`);
    },
    update(id: number, data: FreightCostSave) {
      return requestClient.put<FreightCostRecord>(`${base}/${id}`, data);
    },
  };
}

export const seaCostApi = createFreightApi('/cost-library/sea');
