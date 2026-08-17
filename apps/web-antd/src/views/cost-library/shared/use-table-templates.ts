import type {
  CostMode,
  CostTableTemplate,
  CostTableTemplateLayout,
} from '#/api/cost';

import { listCostTableTemplates } from '#/api/cost/templates';

import { getBuiltinTemplates } from './default-templates';

const STORAGE_PREFIX = 'cost-library:active-template:';
const TEMPLATE_CACHE_TTL_MS = 60_000;

const templateCache = new Map<
  CostMode,
  { at: number; templates: CostTableTemplate[] }
>();

function storageKey(mode: CostMode) {
  return `${STORAGE_PREFIX}${mode}`;
}

function hashLayoutColumns(layout?: CostTableTemplateLayout) {
  const order =
    layout?.fieldOrder?.join(',') ??
    layout?.fields?.join(',') ??
    layout?.groups?.flatMap((group) => group.fields ?? []).join(',') ??
    '';
  const overrides = JSON.stringify(layout?.fieldOverrides ?? {});
  const signature = `${order}|${overrides}`;
  if (!signature || signature === '|{}') {
    return '';
  }
  let hash = 0;
  for (let index = 0; index < signature.length; index += 1) {
    hash = Math.trunc(hash * 31 + (signature.codePointAt(index) ?? 0));
  }
  return Math.abs(hash).toString(36);
}

/** 列布局签名：用于判断是否需要二次 loadColumn */
export function getTemplateLayoutSignature(template: CostTableTemplate) {
  const layout = template.layout;
  const order =
    layout?.fieldOrder?.join(',') ??
    layout?.fields?.join(',') ??
    layout?.groups?.flatMap((group) => group.fields ?? []).join(',') ??
    '';
  const overrides = JSON.stringify(layout?.fieldOverrides ?? {});
  return `${template.id}|${template.createdAt ?? ''}|${order}|${overrides}`;
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

export function invalidateTableTemplateCache(mode?: CostMode) {
  if (mode) {
    templateCache.delete(mode);
    return;
  }
  templateCache.clear();
}

export async function loadTableTemplates(
  mode: CostMode,
  options?: { force?: boolean },
): Promise<CostTableTemplate[]> {
  const force = options?.force === true;
  const cached = templateCache.get(mode);
  if (
    !force &&
    cached &&
    Date.now() - cached.at < TEMPLATE_CACHE_TTL_MS &&
    cached.templates.length > 0
  ) {
    return cached.templates;
  }

  try {
    const remote = await listCostTableTemplates(mode);
    const scoped = remote?.filter((item) => item.mode === mode) ?? [];
    if (scoped.length > 0) {
      templateCache.set(mode, { at: Date.now(), templates: scoped });
      return scoped;
    }
  } catch {
    // 后端未就绪时使用内置默认模板
  }
  const builtin = getBuiltinTemplates(mode);
  templateCache.set(mode, { at: Date.now(), templates: builtin });
  return builtin;
}

export function getGridStorageId(
  mode: CostMode,
  templateId: number,
  layout?: CostTableTemplateLayout,
) {
  const layoutHash = hashLayoutColumns(layout);
  return layoutHash
    ? `cost-library-${mode}-${templateId}-w12-${layoutHash}`
    : `cost-library-${mode}-${templateId}-w12`;
}
