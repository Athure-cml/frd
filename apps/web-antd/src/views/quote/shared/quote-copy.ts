/** 复制新建：从源报价单 id 预填新建页，保存后才落库 */
export const QUOTE_COPY_FROM_STORAGE_KEY = 'quote-copy-from';

export function stashQuoteCopySource(sourceId: number) {
  sessionStorage.setItem(QUOTE_COPY_FROM_STORAGE_KEY, String(sourceId));
}

export function takeQuoteCopySourceId(): null | number {
  const raw = sessionStorage.getItem(QUOTE_COPY_FROM_STORAGE_KEY);
  if (!raw) {
    return null;
  }
  sessionStorage.removeItem(QUOTE_COPY_FROM_STORAGE_KEY);
  const id = Number(raw);
  return Number.isFinite(id) && id > 0 ? id : null;
}
