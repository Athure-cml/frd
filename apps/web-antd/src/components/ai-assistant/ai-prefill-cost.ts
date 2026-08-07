/** AI 拟新增成本 → 跳转对应成本库录入抽屉预填 */

export type AiCostPrefillMode = 'fumigation' | 'road' | 'sea';

export type AiCostPrefillPayload = {
  at: number;
  fields: Record<string, unknown>;
  mode: AiCostPrefillMode;
  summary?: string;
  title?: string;
};

const STORAGE_KEYS: Record<AiCostPrefillMode, string> = {
  fumigation: 'ai-prefill-fumigation-cost',
  road: 'ai-prefill-road-cost',
  sea: 'ai-prefill-sea-cost',
};

const EVENT_NAMES: Record<AiCostPrefillMode, string> = {
  fumigation: 'ai-prefill-fumigation-cost',
  road: 'ai-prefill-road-cost',
  sea: 'ai-prefill-sea-cost',
};

export const AI_COST_ROUTE_NAMES: Record<AiCostPrefillMode, string> = {
  fumigation: 'CostLibraryFumigation',
  road: 'CostLibraryRoad',
  sea: 'CostLibrarySea',
};

/** @deprecated 兼容旧引用 */
export const AI_PREFILL_ROAD_KEY = STORAGE_KEYS.road;
/** @deprecated 兼容旧引用 */
export const AI_PREFILL_ROAD_EVENT = EVENT_NAMES.road;

export function aiPrefillEventName(mode: AiCostPrefillMode) {
  return EVENT_NAMES[mode];
}

export function stashAiCostPrefill(
  mode: AiCostPrefillMode,
  fields: Record<string, unknown>,
  meta?: { summary?: string; title?: string },
) {
  const payload: AiCostPrefillPayload = {
    at: Date.now(),
    fields: { ...fields },
    mode,
    summary: meta?.summary,
    title: meta?.title,
  };
  sessionStorage.setItem(STORAGE_KEYS[mode], JSON.stringify(payload));
  return payload;
}

export function consumeAiCostPrefill(
  mode: AiCostPrefillMode,
): AiCostPrefillPayload | null {
  const raw = sessionStorage.getItem(STORAGE_KEYS[mode]);
  if (!raw) {
    return null;
  }
  sessionStorage.removeItem(STORAGE_KEYS[mode]);
  try {
    const parsed = JSON.parse(raw) as AiCostPrefillPayload;
    if (!parsed?.fields || typeof parsed.fields !== 'object') {
      return null;
    }
    return { ...parsed, mode };
  } catch {
    return null;
  }
}

export function notifyAiCostPrefill(mode: AiCostPrefillMode) {
  window.dispatchEvent(new CustomEvent(EVENT_NAMES[mode]));
}

/** @deprecated 使用 stashAiCostPrefill('road', ...) */
export function stashAiRoadPrefill(
  fields: Record<string, unknown>,
  meta?: { summary?: string; title?: string },
) {
  return stashAiCostPrefill('road', fields, meta);
}

/** @deprecated */
export function consumeAiRoadPrefill() {
  return consumeAiCostPrefill('road');
}

/** @deprecated */
export function notifyAiRoadPrefill() {
  notifyAiCostPrefill('road');
}

export type AiRoadPrefillPayload = AiCostPrefillPayload;
