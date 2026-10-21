import type { QuoteApi } from '#/api/quote';

/** 卡车额外费用固定值（不再从报价库取值） */
export const FIXED_TRUCK_NS_LIFT = 150;
export const FIXED_TRUCK_CHASSIS = 45;
export const FIXED_TRUCK_WAITING = 100;
/** 二次送箱费展示文案（后端为数字字段，不落库该文案） */
export const FIXED_TRUCK_REDELIVERY_RATE = 'AT COST';

export function applyFixedTruckExtraFees(sheet: QuoteApi.QuoteSheetFields) {
  sheet.nsLift = FIXED_TRUCK_NS_LIFT;
  sheet.chassis = FIXED_TRUCK_CHASSIS;
  sheet.waiting = FIXED_TRUCK_WAITING;
  sheet.redeliveryFee = undefined;
}
