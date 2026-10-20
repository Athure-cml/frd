import type {
  CostMode,
  CostTableTemplate,
  CostTableTemplateSave,
} from './types';

import { requestClient } from '#/api/request';

export type TemplateLibrary = 'cost' | 'quote';

function templateBase(library: TemplateLibrary = 'cost') {
  return library === 'quote'
    ? '/quote-library/templates'
    : '/cost-library/templates';
}

export async function listCostTableTemplates(
  mode: CostMode,
  library: TemplateLibrary = 'cost',
) {
  return requestClient.get<CostTableTemplate[]>(templateBase(library), {
    params: { mode },
  });
}

export async function getCostTableTemplate(
  id: number,
  library: TemplateLibrary = 'cost',
) {
  return requestClient.get<CostTableTemplate>(`${templateBase(library)}/${id}`);
}

export async function createCostTableTemplate(
  data: CostTableTemplateSave,
  library: TemplateLibrary = 'cost',
) {
  return requestClient.post<CostTableTemplate>(templateBase(library), data);
}

export async function updateCostTableTemplate(
  id: number,
  data: CostTableTemplateSave,
  library: TemplateLibrary = 'cost',
) {
  return requestClient.put<CostTableTemplate>(
    `${templateBase(library)}/${id}`,
    data,
  );
}

export async function deleteCostTableTemplate(
  id: number,
  library: TemplateLibrary = 'cost',
) {
  return requestClient.delete(`${templateBase(library)}/${id}`);
}

export async function setDefaultCostTableTemplate(
  id: number,
  library: TemplateLibrary = 'cost',
) {
  return requestClient.post<CostTableTemplate>(
    `${templateBase(library)}/${id}/set-default`,
  );
}

export async function exportCostTableTemplate(
  id: number,
  library: TemplateLibrary = 'cost',
) {
  return requestClient.download(`${templateBase(library)}/${id}/export`);
}

export async function exportCostTableTemplatePreview(
  data: CostTableTemplateSave,
  library: TemplateLibrary = 'cost',
) {
  return requestClient.download(`${templateBase(library)}/export`, {
    data,
    method: 'POST',
  });
}
