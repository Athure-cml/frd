import type { Recordable } from '@vben/types';

import type { CostImportResult } from '#/api/cost/types';

import { downloadFileFromBlob } from '@vben/utils';

import { requestClient } from '#/api/request';

export namespace SupplierApi {
  export type SupplierCategory = 'FUMIGATION' | 'OTHER' | 'TRUCK' | 'YARD';

  export interface Supplier {
    category: SupplierCategory;
    code: string;
    contactName?: string;
    createdAt: string;
    createdByName?: string;
    email?: string;
    fumigationNonOakPackageFormula?: string;
    fumigationOakPackageFormula?: string;
    id: number;
    name: string;
    nonFumigationPackageFormula?: string;
    phone?: string;
    pinnedAt?: null | string;
    remark?: string;
    shortName?: string;
    status: 0 | 1;
    /** 其他供应商：类型 ID 字符串 */
    types?: string[];
    updatedAt: string;
  }

  export interface SupplierSave {
    category: SupplierCategory;
    contactName?: string;
    email?: string;
    fumigationNonOakPackageFormula?: string;
    fumigationOakPackageFormula?: string;
    name: string;
    nonFumigationPackageFormula?: string;
    phone?: string;
    remark?: string;
    shortName?: string;
    status: 0 | 1;
    types?: string[];
  }

  export interface SupplierType {
    id: number;
    inUse: boolean;
    name: string;
    sortOrder: number;
    status: 0 | 1;
    updatedAt?: string;
  }

  export interface SupplierTypeSave {
    name: string;
    sortOrder?: number;
    status?: 0 | 1;
  }

  export interface PageResult {
    items: Supplier[];
    total: number;
  }
}

const BASE = '/suppliers';
const TYPE_BASE = '/supplier-types';

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

export async function batchDeleteSupplier(ids: number[]) {
  return requestClient.post(`${BASE}/batch-delete`, { ids });
}

export async function pinSupplier(id: number) {
  return requestClient.post<SupplierApi.Supplier>(`${BASE}/${id}/pin`);
}

export async function unpinSupplier(id: number) {
  return requestClient.post<SupplierApi.Supplier>(`${BASE}/${id}/unpin`);
}

export async function reorderSupplier(ids: number[]) {
  return requestClient.put(`${BASE}/reorder`, { ids });
}

export async function importSupplier(
  file: File,
  category: SupplierApi.SupplierCategory = 'TRUCK',
  options?: { dryRun?: boolean },
) {
  return requestClient.upload<CostImportResult>(`${BASE}/import`, {
    category,
    dryRun: options?.dryRun,
    file,
  });
}

export async function exportSupplier(params: Recordable<any>) {
  return requestClient.download(`${BASE}/export`, { params });
}

export async function downloadSupplierExport(blob: Blob, filename: string) {
  downloadFileFromBlob({ fileName: filename, source: blob });
}

export async function getSupplierTypeList(params?: { enabledOnly?: boolean }) {
  return requestClient.get<SupplierApi.SupplierType[]>(TYPE_BASE, { params });
}

export async function createSupplierType(data: SupplierApi.SupplierTypeSave) {
  return requestClient.post<SupplierApi.SupplierType>(TYPE_BASE, data);
}

export async function updateSupplierType(
  id: number,
  data: SupplierApi.SupplierTypeSave,
) {
  return requestClient.put<SupplierApi.SupplierType>(
    `${TYPE_BASE}/${id}`,
    data,
  );
}

export async function deleteSupplierType(id: number) {
  return requestClient.delete(`${TYPE_BASE}/${id}`);
}
