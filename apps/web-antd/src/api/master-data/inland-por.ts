import type { Recordable } from '@vben/types';

import type { CostImportResult } from '#/api/cost/types';
import type { PageResult } from '#/api/cost/types';

import { downloadFileFromBlob } from '@vben/utils';

import { requestClient } from '#/api/request';

export namespace InlandPorApi {
  export interface InlandPor {
    id: number;
    name: string;
    polCode?: string;
    polId: number;
    polNameEn?: string;
    region: string;
  }

  export type InlandPorSave = Pick<InlandPor, 'name' | 'polId' | 'region'>;
}

const BASE = '/inland-pors';

export async function getInlandPorList(params: Recordable<any>) {
  return requestClient.get<PageResult<InlandPorApi.InlandPor>>(BASE, {
    params,
  });
}

export async function createInlandPor(data: InlandPorApi.InlandPorSave) {
  return requestClient.post<InlandPorApi.InlandPor>(BASE, data);
}

export async function updateInlandPor(
  id: number,
  data: InlandPorApi.InlandPorSave,
) {
  return requestClient.put<InlandPorApi.InlandPor>(`${BASE}/${id}`, data);
}

export async function deleteInlandPor(id: number) {
  return requestClient.delete(`${BASE}/${id}`);
}

export async function importInlandPor(file: File) {
  return requestClient.upload<CostImportResult>(`${BASE}/import`, { file });
}

export async function exportInlandPor(params: Recordable<any>) {
  return requestClient.download(`${BASE}/export`, { params });
}

export async function downloadInlandPorExport(blob: Blob, filename: string) {
  downloadFileFromBlob({ fileName: filename, source: blob });
}
