import type { Recordable } from '@vben/types';

import type { CostImportResult } from '#/api/cost/types';

import { downloadFileFromBlob } from '@vben/utils';

import { requestClient } from '#/api/request';

export namespace AgentApi {
  export interface Agent {
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

  export interface AgentSave {
    contactName?: string;
    email?: string;
    name: string;
    phone?: string;
    remark?: string;
    shortName?: string;
    status: 0 | 1;
  }

  export interface PageResult {
    items: Agent[];
    total: number;
  }
}

const BASE = '/agents';

export async function getAgentList(params?: Recordable<any>) {
  return requestClient.get<AgentApi.PageResult>(BASE, { params });
}

export async function getAgent(id: number) {
  return requestClient.get<AgentApi.Agent>(`${BASE}/${id}`);
}

export async function createAgent(data: AgentApi.AgentSave) {
  return requestClient.post<AgentApi.Agent>(BASE, data);
}

export async function updateAgent(id: number, data: AgentApi.AgentSave) {
  return requestClient.put<AgentApi.Agent>(`${BASE}/${id}`, data);
}

export async function deleteAgent(id: number) {
  return requestClient.delete(`${BASE}/${id}`);
}

export async function batchDeleteAgent(ids: number[]) {
  return requestClient.post(`${BASE}/batch-delete`, { ids });
}

export async function pinAgent(id: number) {
  return requestClient.post<AgentApi.Agent>(`${BASE}/${id}/pin`);
}

export async function unpinAgent(id: number) {
  return requestClient.post<AgentApi.Agent>(`${BASE}/${id}/unpin`);
}

export async function reorderAgent(ids: number[]) {
  return requestClient.put(`${BASE}/reorder`, { ids });
}

export async function importAgent(file: File, options?: { dryRun?: boolean }) {
  return requestClient.upload<CostImportResult>(`${BASE}/import`, {
    dryRun: options?.dryRun,
    file,
  });
}

export async function exportAgent(params: Recordable<any>) {
  return requestClient.download(`${BASE}/export`, { params });
}

export async function downloadAgentExport(blob: Blob, filename: string) {
  downloadFileFromBlob({ fileName: filename, source: blob });
}
