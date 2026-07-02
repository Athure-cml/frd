import type {
  CostMode,
  CostTableTemplate,
  CostTableTemplateLayout,
} from '#/api/cost';

import { listCostTableTemplates } from '#/api/cost/templates';

import { getBuiltinTemplates } from './default-templates';

const STORAGE_PREFIX = 'cost-library:active-template:';

function storageKey(mode: CostMode) {
  return `${STORAGE_PREFIX}${mode}`;
}

function hashLayoutColumns(layout?: CostTableTemplateLayout) {
  const order =
    layout?.fieldOrder?.join(',') ??
    layout?.fields?.join(',') ??
    layout?.groups?.flatMap((group) => group.fields ?? []).join(',') ??
    '';
  if (!order) {
    return '';
  }
  let hash = 0;
  for (let index = 0; index < order.length; index += 1) {
    hash = (hash * 31 + order.codePointAt(index)) | 0;
  }
  return Math.abs(hash).toString(36);
}

export function getSavedTemplateId(mode: CostMode) {
  const raw = localStorage.getItem(storageKey(mode));
  if (!raw) return undefined;
  const id = Number(raw);
  return Number.isFinite(id) ? id : undefined;
}

export function saveTemplateId(mode: CostMode, id: number) {
  localStorage.setItem(storageKey(mode), String(id));
}

export function resolveActiveTemplate(
  templates: CostTableTemplate[],
  mode: CostMode,
) {
  const scoped = templates.filter((item) => item.mode === mode);
  const pool = scoped.length > 0 ? scoped : templates;
  const enabled = pool.find((item) => item.isDefault);
  if (enabled) {
    return enabled;
  }
  const savedId = getSavedTemplateId(mode);
  if (savedId) {
    const saved = pool.find((item) => item.id === savedId);
    if (saved) return saved;
  }
  return pool[0];
}

export async function loadTableTemplates(
  mode: CostMode,
): Promise<CostTableTemplate[]> {
  try {
    const remote = await listCostTableTemplates(mode);
    const scoped = remote?.filter((item) => item.mode === mode) ?? [];
    if (scoped.length > 0) {
      return scoped;
    }
  } catch {
    // 后端未就绪时使用内置默认模板
  }
  return getBuiltinTemplates(mode);
}

export function getGridStorageId(
  mode: CostMode,
  templateId: number,
  layout?: CostTableTemplateLayout,
) {
  const layoutHash = hashLayoutColumns(layout);
  return layoutHash
    ? `cost-library-${mode}-${templateId}-${layoutHash}`
    : `cost-library-${mode}-${templateId}`;
}
