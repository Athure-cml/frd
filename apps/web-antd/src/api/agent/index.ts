import type { Recordable } from '@vben/types';

import type { CostImportResult } from '#/api/cost/types';

import { downloadFileFromBlob } from '@vben/utils';

import { requestClient } from '#/api/request';

export namespace AgentApi {
  export interface Agent {
    code: string;
    createdAt: string;
    createdByName?: string;
    email?: string;
    id: number;
    name: string;
    remark?: string;
    status: 0 | 1;
    updatedAt: string;
  }

  export interface AgentSave {
    email?: string;
    name: string;
    remark?: string;
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

export async function importAgent(file: File) {
  return requestClient.upload<CostImportResult>(`${BASE}/import`, { file });
}

export async function exportAgent(params: Recordable<any>) {
  return requestClient.download(`${BASE}/export`, { params });
}

export async function downloadAgentExport(blob: Blob, filename: string) {
  downloadFileFromBlob({ fileName: filename, source: blob });
}
