/** 复制新建：从源询价单 id 预填新建页，保存后才落库 */
export const INQUIRY_COPY_FROM_STORAGE_KEY = 'inquiry-copy-from';

export function stashInquiryCopySource(sourceId: number) {
  sessionStorage.setItem(INQUIRY_COPY_FROM_STORAGE_KEY, String(sourceId));
}

export function takeInquiryCopySourceId(): null | number {
  const raw = sessionStorage.getItem(INQUIRY_COPY_FROM_STORAGE_KEY);
  if (!raw) {
    return null;
  }
  sessionStorage.removeItem(INQUIRY_COPY_FROM_STORAGE_KEY);
  const id = Number(raw);
  return Number.isFinite(id) && id > 0 ? id : null;
}
