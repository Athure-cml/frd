import type { Recordable } from '@vben/types';

import type { CostImportResult } from '#/api/cost/types';

import { downloadFileFromBlob } from '@vben/utils';

import { requestClient } from '#/api/request';

export namespace ShippingLineApi {
  export interface ShippingLine {
    code: string;
    contactName?: string;
    createdAt: string;
    createdByName?: string;
    email?: string;
    id: number;
    name: string;
    phone?: string;
    pinnedAt?: null | string;
    remark?: string;
    shortName?: string;
    status: 0 | 1;
    updatedAt: string;
  }

  export interface ShippingLineSave {
    contactName?: string;
    email?: string;
    name: string;
    phone?: string;
    remark?: string;
    shortName?: string;
    status: 0 | 1;
  }

  export interface PageResult {
    items: ShippingLine[];
    total: number;
  }
}

const BASE = '/shipping-lines';

export async function getShippingLineList(params?: Recordable<any>) {
  return requestClient.get<ShippingLineApi.PageResult>(BASE, {
    params,
  });
}

export async function getShippingLine(id: number) {
  return requestClient.get<ShippingLineApi.ShippingLine>(`${BASE}/${id}`);
}

export async function createShippingLine(
  data: ShippingLineApi.ShippingLineSave,
) {
  return requestClient.post<ShippingLineApi.ShippingLine>(BASE, data);
}

export async function updateShippingLine(
  id: number,
  data: ShippingLineApi.ShippingLineSave,
) {
  return requestClient.put<ShippingLineApi.ShippingLine>(`${BASE}/${id}`, data);
}

export async function deleteShippingLine(id: number) {
  return requestClient.delete(`${BASE}/${id}`);
}

export async function batchDeleteShippingLine(ids: number[]) {
  return requestClient.post(`${BASE}/batch-delete`, { ids });
}

export async function pinShippingLine(id: number) {
  return requestClient.post<ShippingLineApi.ShippingLine>(`${BASE}/${id}/pin`);
}

export async function unpinShippingLine(id: number) {
  return requestClient.post<ShippingLineApi.ShippingLine>(
    `${BASE}/${id}/unpin`,
  );
}

export async function reorderShippingLine(ids: number[]) {
  return requestClient.put(`${BASE}/reorder`, { ids });
}

export async function importShippingLine(
  file: File,
  options?: { dryRun?: boolean },
) {
  return requestClient.upload<CostImportResult>(`${BASE}/import`, {
    dryRun: options?.dryRun,
    file,
  });
}

export async function exportShippingLine(params: Recordable<any>) {
  return requestClient.download(`${BASE}/export`, { params });
}

export async function downloadShippingLineExport(blob: Blob, filename: string) {
  downloadFileFromBlob({ fileName: filename, source: blob });
}
