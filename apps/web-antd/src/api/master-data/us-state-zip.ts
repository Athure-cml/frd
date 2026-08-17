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

/** 熏蒸 REGION 等：按关键词搜索去重城市名 */
export async function searchDestCityNameOptions(params?: {
  keyword?: string;
  limit?: number;
}) {
  const list = await requestClient.get<string[]>(`${BASE}/cities/options`, {
    params: {
      keyword: params?.keyword || undefined,
      limit: params?.limit ?? 50,
    },
  });
  return list.map((name) => ({
    label: name,
    value: name,
  }));
}

export type DestZipResolveStatus =
  | 'ambiguous'
  | 'notFound'
  | 'skipped'
  | 'unique';

export interface DestZipResolveItem {
  candidates?: string[];
  city: string;
  message?: string;
  state: string;
  status: DestZipResolveStatus;
  zipCode?: null | string;
}

/** 按 City+State 批量解析邮编（唯一匹配才返回 zip） */
export async function resolveDestZips(
  items: Array<{ city: string; state: string }>,
) {
  return requestClient.post<DestZipResolveItem[]>(
    `${BASE}/resolve-zips`,
    items,
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

export async function importUsStateZipGeonames(file: File) {
  return requestClient.upload<CostImportResult>(
    `${BASE}/import-geonames`,
    { file },
    { timeout: 600_000 },
  );
}

export async function importUsStateZipFile(file: File) {
  if (file.name.toLowerCase().endsWith('.txt')) {
    return importUsStateZipGeonames(file);
  }
  return importUsStateZip(file);
}

export async function exportUsStateZip(params?: Recordable<any>) {
  return requestClient.download(`${BASE}/export`, { params });
}

export async function downloadUsStateZipExport(blob: Blob, filename: string) {
  downloadFileFromBlob({ fileName: filename, source: blob });
}

export type { Recordable };
