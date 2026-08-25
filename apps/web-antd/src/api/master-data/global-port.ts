import type { Recordable } from '@vben/types';

import type { CostImportResult, PageResult } from '#/api/cost/types';

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
    label: formatPortOptionLabel(item),
    value: item.id,
  }));
}

function formatPortOptionLabel(item: GlobalPortApi.GlobalPort) {
  const name = item.nameEn?.trim() || item.code;
  const typeLabel = formatPortTypeLabel(item.portType);
  return typeLabel ? `${name}/${typeLabel}` : name;
}

function formatPortTypeLabel(portType?: GlobalPortApi.PortType) {
  if (!portType) {
    return '';
  }
  // 下拉简写，与业务习惯一致：港口 / 内陆 / 铁路
  switch (portType) {
    case 'AIRPORT': {
      return '机场';
    }
    case 'INLAND': {
      return '内陆';
    }
    case 'OTHER': {
      return '其他';
    }
    case 'RAIL': {
      return '铁路';
    }
    case 'SEAPORT': {
      return '港口';
    }
    default: {
      return '';
    }
  }
}

/** 海运录入下拉：value 存英文港名，附带中文名供自动带入 */
export interface GlobalPortNameOption {
  label: string;
  nameZh?: string;
  portType?: GlobalPortApi.PortType;
  value: string;
}

/** 选中后搜索框可能残留「名称/类型」或旧「CODE · 名称」，提取有效检索词 */
function normalizePortSearchKeyword(keyword?: string) {
  const raw = keyword?.trim() || '';
  if (!raw) {
    return '';
  }
  // 名称/类型
  if (raw.includes('/')) {
    const namePart = raw.split('/')[0]?.trim();
    if (namePart) {
      return namePart;
    }
  }
  const parts = raw
    .split('·')
    .map((part) => part.trim())
    .filter(Boolean);
  const firstPart = parts[0];
  if (parts.length >= 2 && firstPart && /^[A-Z0-9]{3,}$/i.test(firstPart)) {
    return parts.at(-1) || raw;
  }
  return raw;
}

export async function searchGlobalPortNameOptions(params?: {
  keyword?: string;
  limit?: number;
  portTypes?: GlobalPortApi.PortType[];
}): Promise<GlobalPortNameOption[]> {
  const limit = params?.limit ?? 50;
  const keyword = normalizePortSearchKeyword(params?.keyword);
  const list = await requestClient.get<GlobalPortApi.GlobalPort[]>(
    `${BASE}/options`,
    {
      params: {
        keyword: keyword || undefined,
        // 多取一些再按港名去重，避免同名港口挤占下拉
        limit: Math.min(Math.max(limit * 2, limit), 100),
        portTypes: params?.portTypes,
      },
    },
  );

  const seenName = new Set<string>();
  const seenCode = new Set<string>();
  const options: GlobalPortNameOption[] = [];

  for (const item of list) {
    const code = item.code?.trim() || '';
    const nameEn = item.nameEn?.trim() || '';
    if (!nameEn) {
      continue;
    }
    const nameKey = nameEn.toUpperCase();
    const codeKey = code.toUpperCase();
    if (seenName.has(nameKey) || (codeKey && seenCode.has(codeKey))) {
      continue;
    }
    seenName.add(nameKey);
    if (codeKey) {
      seenCode.add(codeKey);
    }
    options.push({
      label: formatPortOptionLabel(item),
      nameZh: item.nameZh?.trim() || undefined,
      portType: item.portType,
      value: nameEn,
    });
    if (options.length >= limit) {
      break;
    }
  }

  return options;
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
    label: formatPortOptionLabel(item),
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

export async function importGlobalPort(
  file: File,
  options?: { dryRun?: boolean },
) {
  return requestClient.upload<CostImportResult>(`${BASE}/import`, {
    dryRun: options?.dryRun,
    file,
  });
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
