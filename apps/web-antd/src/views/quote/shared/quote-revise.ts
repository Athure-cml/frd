/** 变更新建：只带基础信息进新建页，保存时再落已报价 */

export const QUOTE_REVISE_FROM_STORAGE_KEY = 'quote-revise-from';

export type QuoteReviseStash = {
  changeReason: string;
  sourceId: number;
};

export function stashQuoteReviseSource(payload: QuoteReviseStash) {
  sessionStorage.setItem(
    QUOTE_REVISE_FROM_STORAGE_KEY,
    JSON.stringify(payload),
  );
}

export function takeQuoteReviseSource(): null | QuoteReviseStash {
  const raw = sessionStorage.getItem(QUOTE_REVISE_FROM_STORAGE_KEY);
  if (!raw) {
    return null;
  }
  sessionStorage.removeItem(QUOTE_REVISE_FROM_STORAGE_KEY);
  try {
    const parsed = JSON.parse(raw) as QuoteReviseStash;
    const sourceId = Number(parsed?.sourceId);
    const changeReason = String(parsed?.changeReason ?? '').trim();
    if (!Number.isFinite(sourceId) || sourceId <= 0 || !changeReason) {
      return null;
    }
    return { changeReason, sourceId };
  } catch {
    return null;
  }
}
