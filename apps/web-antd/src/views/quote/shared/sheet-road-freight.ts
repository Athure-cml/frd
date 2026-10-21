import type { QuoteApi } from '#/api/quote';

/** 卡车报价库引入上限（与海运多行类似） */
export const MAX_ROAD_MATCHES = 2;

type TranslateFn = (key: string, args?: unknown[]) => string;

/** 单条：卡车费 Trucking fee；多条：卡车费1 Trucking fee */
export function truckingFeeLabel(
  index: number,
  total: number,
  t: TranslateFn,
): string {
  if (total <= 1) {
    return t('page.quote.sheet.truckingFee');
  }
  return t('page.quote.sheet.truckingFeeN', [index + 1]);
}

/** 参与展示/打印的卡车费列表（最多 2 条） */
export function resolveTruckingFeeValues(
  sheet: QuoteApi.QuoteSheetFields,
  options?: { roadMatchCount?: number },
): Array<{ field: 'truckingFee2' | 'truckingFee'; value: number | undefined }> {
  const first = sheet.truckingFee;
  const second = sheet.truckingFee2;
  const hasSecondValue =
    second !== undefined && second !== null && !Number.isNaN(Number(second));
  const hasSecondSlot =
    hasSecondValue || (options?.roadMatchCount ?? 0) >= MAX_ROAD_MATCHES;
  if (hasSecondSlot) {
    return [
      { field: 'truckingFee', value: first },
      { field: 'truckingFee2', value: second },
    ];
  }
  return [{ field: 'truckingFee', value: first }];
}
