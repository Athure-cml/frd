import type { Recordable } from '@vben/types';

import type { CostImportResult } from '#/api/cost/types';

import { downloadFileFromBlob } from '@vben/utils';

import { requestClient } from '#/api/request';

export namespace CustomerApi {
  export interface Customer {
    address?: string;
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

  export interface CustomerSave {
    address?: string;
    contactName?: string;
    email?: string;
    name: string;
    phone?: string;
    remark?: string;
    shortName?: string;
    status: 0 | 1;
  }

  export interface PageResult {
    items: Customer[];
    total: number;
  }
}

const BASE = '/customers';

export async function getCustomerList(params?: Recordable<any>) {
  return requestClient.get<CustomerApi.PageResult>(BASE, { params });
}

export async function getCustomer(id: number) {
  return requestClient.get<CustomerApi.Customer>(`${BASE}/${id}`);
}

export async function createCustomer(data: CustomerApi.CustomerSave) {
  return requestClient.post<CustomerApi.Customer>(BASE, data);
}

export async function updateCustomer(
  id: number,
  data: CustomerApi.CustomerSave,
) {
  return requestClient.put<CustomerApi.Customer>(`${BASE}/${id}`, data);
}

export async function deleteCustomer(id: number) {
  return requestClient.delete(`${BASE}/${id}`);
}

export async function batchDeleteCustomer(ids: number[]) {
  return requestClient.post(`${BASE}/batch-delete`, { ids });
}

export async function pinCustomer(id: number) {
  return requestClient.post<CustomerApi.Customer>(`${BASE}/${id}/pin`);
}

export async function unpinCustomer(id: number) {
  return requestClient.post<CustomerApi.Customer>(`${BASE}/${id}/unpin`);
}

export async function reorderCustomer(ids: number[]) {
  return requestClient.put(`${BASE}/reorder`, { ids });
}

export async function importCustomer(
  file: File,
  options?: { dryRun?: boolean },
) {
  return requestClient.upload<CostImportResult>(`${BASE}/import`, {
    dryRun: options?.dryRun,
    file,
  });
}

export async function exportCustomer(params: Recordable<any>) {
  return requestClient.download(`${BASE}/export`, { params });
}

export async function downloadCustomerExport(blob: Blob, filename: string) {
  downloadFileFromBlob({ fileName: filename, source: blob });
}
