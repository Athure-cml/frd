import type { Recordable } from '@vben/types';

import type { CostImportResult } from '#/api/cost/types';

import { downloadFileFromBlob } from '@vben/utils';

import { requestClient } from '#/api/request';

export namespace SupplierApi {
  export type SupplierType =
    | 'BOOKING_AGENT'
    | 'CONTAINER_LEASING'
    | 'CUSTOMS_BROKER'
    | 'DEDICATED_LINE'
    | 'FLEET'
    | 'OTHER'
    | 'WAREHOUSE';

  export interface Supplier {
    code: string;
    createdAt: string;
    createdByName?: string;
    email?: string;
    fumigationNonOakPackageFormula?: string;
    fumigationOakPackageFormula?: string;
    id: number;
    name: string;
    nonFumigationPackageFormula?: string;
    remark?: string;
    status: 0 | 1;
    types?: SupplierType[];
    updatedAt: string;
  }

  export interface SupplierSave {
    email?: string;
    fumigationNonOakPackageFormula?: string;
    fumigationOakPackageFormula?: string;
    name: string;
    nonFumigationPackageFormula?: string;
    remark?: string;
    status: 0 | 1;
    types?: SupplierType[];
  }

  export interface PageResult {
    items: Supplier[];
    total: number;
  }
}

const BASE = '/suppliers';

export async function getSupplierList(params?: Recordable<any>) {
  return requestClient.get<SupplierApi.PageResult>(BASE, { params });
}

export async function getSupplier(id: number) {
  return requestClient.get<SupplierApi.Supplier>(`${BASE}/${id}`);
}

export async function createSupplier(data: SupplierApi.SupplierSave) {
  return requestClient.post<SupplierApi.Supplier>(BASE, data);
}

export async function updateSupplier(
  id: number,
  data: SupplierApi.SupplierSave,
) {
  return requestClient.put<SupplierApi.Supplier>(`${BASE}/${id}`, data);
}

export async function deleteSupplier(id: number) {
  return requestClient.delete(`${BASE}/${id}`);
}

export async function importSupplier(file: File) {
  return requestClient.upload<CostImportResult>(`${BASE}/import`, { file });
}

export async function exportSupplier(params: Recordable<any>) {
  return requestClient.download(`${BASE}/export`, { params });
}

export async function downloadSupplierExport(blob: Blob, filename: string) {
  downloadFileFromBlob({ fileName: filename, source: blob });
}
