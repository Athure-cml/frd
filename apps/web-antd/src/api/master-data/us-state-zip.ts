import type { Recordable } from '@vben/types';

import type { CostImportResult, PageResult } from '#/api/cost/types';

import { downloadFileFromBlob } from '@vben/utils';

import { requestClient } from '#/api/request';

export namespace UsStateZipApi {
  export interface Row {
    city: string;
    cityId: number;
    id: number;
    stateCode: string;
    stateId: number;
    zipCode: string;
  }

  export interface TreeNode {
    city?: string;
    cityId?: number;
    hasChild?: boolean;
    id: string;
    nodeType: 'city' | 'state' | 'zip';
    parentId?: string;
    stateCode?: string;
    stateId?: number;
    zipCode?: string;
    zipId?: number;
  }

  export interface City {
    id: number;
    name: string;
    stateId: number;
  }

  export interface Zip {
    cityId: number;
    id: number;
    zipCode: string;
  }
}

const BASE = '/dest-addresses';

export async function getUsStateZipList(params: Recordable<any>) {
  return requestClient.get<PageResult<UsStateZipApi.Row>>(BASE, { params });
}

export async function getUsStateZipCityNodes(
  stateId: number,
  params?: { keyword?: string },
) {
  return requestClient.get<UsStateZipApi.TreeNode[]>(
    `${BASE}/tree/states/${stateId}/cities`,
    { params },
  );
}

export async function createUsStateZipCity(data: {
  name: string;
  stateId: number;
}) {
  return requestClient.post<UsStateZipApi.City>(`${BASE}/cities`, data);
}

export async function createUsStateZip(data: {
  cityId: number;
  zipCode: string;
}) {
  return requestClient.post<UsStateZipApi.Zip>(`${BASE}/zips`, data);
}

export async function updateUsStateZip(
  id: number,
  data: { cityId: number; zipCode: string },
) {
  return requestClient.put<UsStateZipApi.Zip>(`${BASE}/zips/${id}`, data);
}

export async function deleteUsStateZip(id: number) {
  return requestClient.delete(`${BASE}/zips/${id}`);
}

export async function importUsStateZip(file: File) {
  return requestClient.upload<CostImportResult>(`${BASE}/import`, { file });
}

export async function exportUsStateZip() {
  return requestClient.download(`${BASE}/export`);
}

export async function downloadUsStateZipExport(blob: Blob, filename: string) {
  downloadFileFromBlob({ fileName: filename, source: blob });
}

export type { Recordable };
