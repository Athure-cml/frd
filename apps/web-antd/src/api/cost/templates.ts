import type {
  CostMode,
  CostTableTemplate,
  CostTableTemplateSave,
} from './types';

import { requestClient } from '#/api/request';

const BASE = '/cost-library/templates';

export async function listCostTableTemplates(mode: CostMode) {
  return requestClient.get<CostTableTemplate[]>(BASE, { params: { mode } });
}

export async function getCostTableTemplate(id: number) {
  return requestClient.get<CostTableTemplate>(`${BASE}/${id}`);
}

export async function createCostTableTemplate(data: CostTableTemplateSave) {
  return requestClient.post<CostTableTemplate>(BASE, data);
}

export async function updateCostTableTemplate(
  id: number,
  data: CostTableTemplateSave,
) {
  return requestClient.put<CostTableTemplate>(`${BASE}/${id}`, data);
}

export async function deleteCostTableTemplate(id: number) {
  return requestClient.delete(`${BASE}/${id}`);
}

export async function setDefaultCostTableTemplate(id: number) {
  return requestClient.post<CostTableTemplate>(`${BASE}/${id}/set-default`);
}

export async function exportCostTableTemplate(id: number) {
  return requestClient.download(`${BASE}/${id}/export`);
}

export async function exportCostTableTemplatePreview(
  data: CostTableTemplateSave,
) {
  return requestClient.download(`${BASE}/export`, {
    data,
    method: 'POST',
  });
}
