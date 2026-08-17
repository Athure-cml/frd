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
    batchCopy(data: {
      applyOverrides?: boolean;
      buc?: number;
      bucEffDate?: string;
      bucValidDate?: string;
      containerType?: string;
      freight?: number;
      freightEffDate?: string;
      freightValidDate?: string;
      ids: number[];
      others?: number;
      othersEffDate?: string;
      othersValidDate?: string;
    }) {
      return requestClient.post<{ created: number }>(
        `${base}/batch-copy`,
        data,
      );
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
    importExcel(file: File, templateId?: number, dryRun?: boolean) {
      return requestClient.upload<CostImportResult>(`${base}/import`, {
        file,
        ...(typeof templateId === 'number' ? { templateId } : {}),
        ...(dryRun ? { dryRun: true } : {}),
      });
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
