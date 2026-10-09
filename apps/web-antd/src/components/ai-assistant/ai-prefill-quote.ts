/** AI 拟新建报价 → 跳转新建报价页预填（不落库，用户点创建才保存） */

export type AiQuotePrefillPayload = {
  at: number;
  matched?: boolean;
  payload: Record<string, unknown>;
  summary?: string;
  title?: string;
  warnings?: string[];
};

export const AI_PREFILL_QUOTE_KEY = 'ai-prefill-quote';
export const AI_PREFILL_QUOTE_EVENT = 'ai-prefill-quote';
export const AI_QUOTE_ROUTE_NAME = 'QuoteCreate';

export function stashAiQuotePrefill(
  payload: Record<string, unknown>,
  meta?: {
    matched?: boolean;
    summary?: string;
    title?: string;
    warnings?: string[];
  },
) {
  const stash: AiQuotePrefillPayload = {
    at: Date.now(),
    matched: meta?.matched,
    payload: { ...payload },
    summary: meta?.summary,
    title: meta?.title,
    warnings: meta?.warnings,
  };
  sessionStorage.setItem(AI_PREFILL_QUOTE_KEY, JSON.stringify(stash));
  return stash;
}

export function consumeAiQuotePrefill(): AiQuotePrefillPayload | null {
  const raw = sessionStorage.getItem(AI_PREFILL_QUOTE_KEY);
  if (!raw) {
    return null;
  }
  sessionStorage.removeItem(AI_PREFILL_QUOTE_KEY);
  try {
    const parsed = JSON.parse(raw) as AiQuotePrefillPayload;
    if (!parsed?.payload || typeof parsed.payload !== 'object') {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function notifyAiQuotePrefill() {
  window.dispatchEvent(new CustomEvent(AI_PREFILL_QUOTE_EVENT));
}

export function clearAiQuotePrefill() {
  sessionStorage.removeItem(AI_PREFILL_QUOTE_KEY);
}
