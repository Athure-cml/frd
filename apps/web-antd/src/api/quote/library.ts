import type { Recordable } from '@vben/types';

import type {
  FreightCostRecord,
  FumigationCostRecord,
  PageResult,
  RoadCostRecord,
} from '#/api/cost';

import { requestClient } from '#/api/request';

const BASE = '/quote-library';

export interface QuoteLibraryEditContext {
  costFloors: Record<string, number>;
  defaultValues: Record<string, number>;
  editableFields: string[];
  id: number;
  values: Record<string, number>;
}

export interface QuoteLibraryBatchUpdateResult {
  updated: number;
}

export interface QuoteLibraryPromoteResult {
  notFound: number;
  promoted: number;
  skipped: number;
}

export async function getQuoteLibraryRoadList(params: Recordable<any>) {
  return requestClient.get<PageResult<RoadCostRecord>>(`${BASE}/road`, {
    params,
  });
}

export async function getQuoteLibrarySeaList(params: Recordable<any>) {
  return requestClient.get<PageResult<FreightCostRecord>>(`${BASE}/sea`, {
    params,
  });
}

export async function getQuoteLibraryFumigationList(params: Recordable<any>) {
  return requestClient.get<PageResult<FumigationCostRecord>>(
    `${BASE}/fumigation`,
    { params },
  );
}

export function getQuoteLibraryListApi(mode: 'fumigation' | 'road' | 'sea') {
  if (mode === 'sea') {
    return getQuoteLibrarySeaList;
  }
  if (mode === 'fumigation') {
    return getQuoteLibraryFumigationList;
  }
  return getQuoteLibraryRoadList;
}

function modeBase(mode: 'fumigation' | 'road' | 'sea') {
  return `${BASE}/${mode}`;
}

export async function getQuoteLibraryEditContext(
  mode: 'fumigation' | 'road' | 'sea',
  id: number,
) {
  return requestClient.get<QuoteLibraryEditContext>(
    `${modeBase(mode)}/${id}/edit-context`,
  );
}

export async function updateQuoteLibraryRecord(
  mode: 'fumigation' | 'road' | 'sea',
  id: number,
  fields: Record<string, number>,
) {
  return requestClient.put(`${modeBase(mode)}/${id}`, { fields });
}

export async function resetQuoteLibraryRecord(
  mode: 'fumigation' | 'road' | 'sea',
  id: number,
) {
  return requestClient.post<QuoteLibraryEditContext>(
    `${modeBase(mode)}/${id}/reset`,
  );
}

export async function batchUpdateQuoteLibrary(
  mode: 'fumigation' | 'road' | 'sea',
  payload: { fields: Record<string, number>; ids: number[] },
) {
  return requestClient.post<QuoteLibraryBatchUpdateResult>(
    `${modeBase(mode)}/batch-update`,
    payload,
  );
}

export async function deleteQuoteLibraryRecord(
  mode: 'fumigation' | 'road' | 'sea',
  id: number,
) {
  return requestClient.delete(`${modeBase(mode)}/${id}`);
}

export async function batchDeleteQuoteLibrary(
  mode: 'fumigation' | 'road' | 'sea',
  ids: number[],
) {
  return requestClient.post(`${modeBase(mode)}/batch-delete`, { ids });
}

export async function promoteToQuoteLibrary(
  mode: 'fumigation' | 'road' | 'sea',
  ids: number[],
) {
  return requestClient.post<QuoteLibraryPromoteResult>(
    `${modeBase(mode)}/promote`,
    { ids },
  );
}

export async function exportQuoteLibrary(
  mode: 'fumigation' | 'road' | 'sea',
  params: Recordable<any>,
) {
  return requestClient.download(`${modeBase(mode)}/export`, { params });
}
