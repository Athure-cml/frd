import type { Recordable } from '@vben/types';

import type {
  CostBatchCopyResult,
  CostBatchUpdatePayload,
  CostImportResult,
  FreightCostRecord,
  FreightCostSave,
  PageResult,
} from './types';

import { IMPORT_REQUEST_TIMEOUT_MS } from '#/api/import-request';
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
      ebs?: number;
      ebsValidDate?: string;
      freight?: number;
      freightEffDate?: string;
      freightValidDate?: string;
      gri?: number;
      griValidDate?: string;
      ids: number[];
      others?: number;
      othersEffDate?: string;
      othersValidDate?: string;
      previewOnly?: boolean;
      remark?: string;
    }) {
      return requestClient.post<CostBatchCopyResult<FreightCostRecord>>(
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
      return requestClient.upload<CostImportResult>(
        `${base}/import`,
        {
          file,
          ...(typeof templateId === 'number' ? { templateId } : {}),
          ...(dryRun ? { dryRun: true } : {}),
        },
        { timeout: IMPORT_REQUEST_TIMEOUT_MS },
      );
    },
    list(params: Recordable<any>) {
      return requestClient.get<PageResult<FreightCostRecord>>(base, { params });
    },
    listIds(params: Recordable<any>) {
      return requestClient.get<number[]>(`${base}/ids`, { params });
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
