import type { Recordable } from '@vben/types';

import type { CostImportResult } from '#/api/cost/types';
import type { PageResult } from '#/api/cost/types';

import { downloadFileFromBlob } from '@vben/utils';

import { requestClient } from '#/api/request';

export namespace GlobalPortApi {
  export type PortType = 'AIRPORT' | 'INLAND' | 'OTHER' | 'RAIL' | 'SEAPORT';

  export interface GlobalPort {
    code: string;
    countryRegion: string;
    dataVersion?: string;
    id: number;
    nameEn: string;
    nameZh: string;
    portType?: PortType;
    route: string;
  }

  export type GlobalPortSave = Omit<GlobalPort, 'dataVersion' | 'id'>;

  export interface SyncResult {
    dataVersion: string;
    inserted: number;
    skipped: number;
    syncedAt: string;
    totalParsed: number;
    updated: number;
  }

  export interface SyncStatus {
    errorMessage?: string;
    phase?: 'IMPORTING' | 'LOADING';
    result?: SyncResult;
    startedAt?: string;
    status: 'COMPLETED' | 'FAILED' | 'IDLE' | 'RUNNING';
  }
}

const BASE = '/global-ports';

export async function getGlobalPortList(params: Recordable<any>) {
  return requestClient.get<PageResult<GlobalPortApi.GlobalPort>>(BASE, {
    params,
  });
}

export async function getGlobalPortOptions(params?: {
  portType?: GlobalPortApi.PortType;
}) {
  const result = await getGlobalPortList({
    page: 1,
    pageSize: 500,
    ...params,
  });
  return result.items.map((item) => ({
    label: `${item.code} · ${item.nameEn}`,
    value: item.id,
  }));
}

export async function getPolPodPortOptions() {
  return getGlobalPortOptions({ portType: 'SEAPORT' });
}

export async function getPorPortOptions() {
  const [inland, rail] = await Promise.all([
    getGlobalPortList({ page: 1, pageSize: 500, portType: 'INLAND' }),
    getGlobalPortList({ page: 1, pageSize: 500, portType: 'RAIL' }),
  ]);
  return [...inland.items, ...rail.items].map((item) => ({
    label: `${item.code} · ${item.nameEn}`,
    value: item.id,
  }));
}

export async function createGlobalPort(data: GlobalPortApi.GlobalPortSave) {
  return requestClient.post<GlobalPortApi.GlobalPort>(BASE, data);
}

export async function updateGlobalPort(
  id: number,
  data: GlobalPortApi.GlobalPortSave,
) {
  return requestClient.put<GlobalPortApi.GlobalPort>(`${BASE}/${id}`, data);
}

export async function deleteGlobalPort(id: number) {
  return requestClient.delete(`${BASE}/${id}`);
}

export async function importGlobalPort(file: File) {
  return requestClient.upload<CostImportResult>(`${BASE}/import`, { file });
}

export async function exportGlobalPort(params: Recordable<any>) {
  return requestClient.download(`${BASE}/export`, { params });
}

export async function downloadGlobalPortExport(blob: Blob, filename: string) {
  downloadFileFromBlob({ fileName: filename, source: blob });
}

export async function syncGlobalPortFromUnlocode() {
  return requestClient.post<GlobalPortApi.SyncStatus>(`${BASE}/sync`);
}

export async function getGlobalPortSyncStatus() {
  return requestClient.get<GlobalPortApi.SyncStatus>(`${BASE}/sync/status`);
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** 触发异步同步并轮询直至完成（最长 10 分钟） */
export async function waitForGlobalPortSync(
  onPhase?: (phase?: GlobalPortApi.SyncStatus['phase']) => void,
) {
  const initial = await syncGlobalPortFromUnlocode();
  if (initial.status === 'COMPLETED' && initial.result) {
    return initial.result;
  }
  if (initial.status === 'FAILED') {
    throw new Error(initial.errorMessage ?? '同步失败');
  }
  onPhase?.(initial.phase);

  const deadline = Date.now() + 600_000;
  while (Date.now() < deadline) {
    await sleep(2000);
    const status = await getGlobalPortSyncStatus();
    onPhase?.(status.phase);
    if (status.status === 'COMPLETED' && status.result) {
      return status.result;
    }
    if (status.status === 'FAILED') {
      throw new Error(status.errorMessage ?? '同步失败');
    }
  }
  throw new Error('同步超时，请稍后刷新页面查看结果');
}
