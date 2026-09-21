/** 卡车成本库 → 新建报价单：预填选中的卡车成本行 */
export const ROAD_QUOTE_INTRODUCE_STORAGE_KEY = 'quote-road-introduce';

export function stashRoadQuoteIntroduce(roadCostId: number) {
  sessionStorage.setItem(ROAD_QUOTE_INTRODUCE_STORAGE_KEY, String(roadCostId));
}

export function takeRoadQuoteIntroduceId(): null | number {
  const raw = sessionStorage.getItem(ROAD_QUOTE_INTRODUCE_STORAGE_KEY);
  if (!raw) {
    return null;
  }
  sessionStorage.removeItem(ROAD_QUOTE_INTRODUCE_STORAGE_KEY);
  const id = Number(raw);
  return Number.isFinite(id) && id > 0 ? id : null;
}
