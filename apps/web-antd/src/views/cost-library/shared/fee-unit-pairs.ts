/**
 * 费用金额 ↔ 单位字段配对（按稳定 field key，不依赖列相邻）。
 * 单位列仅用于导入/导出与表单；列表把单位拼到金额后（如 20/hours）。
 */
export const ROAD_WAITING_UNIT_FIELD = 'cf_road_waiting_unit';
export const ROAD_YARD_STORAGE_FIELD = 'cf_road_yard_storage';
export const ROAD_YARD_STORAGE_UNIT_FIELD = 'cf_road_yard_storage_unit';
export const ROAD_EXTRA_CHASSIS_FIELD = 'cf_road_extra_chassis';
export const ROAD_EXTRA_CHASSIS_UNIT_FIELD = 'cf_road_extra_chassis_unit';

/** amountField → unitField */
export const ROAD_FEE_UNIT_BY_AMOUNT: Record<string, string> = {
  waitingFee: ROAD_WAITING_UNIT_FIELD,
  [ROAD_YARD_STORAGE_FIELD]: ROAD_YARD_STORAGE_UNIT_FIELD,
  [ROAD_EXTRA_CHASSIS_FIELD]: ROAD_EXTRA_CHASSIS_UNIT_FIELD,
};

const UNIT_FIELD_SET = new Set(Object.values(ROAD_FEE_UNIT_BY_AMOUNT));

export function isRoadFeeUnitField(field: string) {
  return UNIT_FIELD_SET.has(field);
}

export function resolveRoadFeeUnitField(amountField: string) {
  return ROAD_FEE_UNIT_BY_AMOUNT[amountField];
}

export function readRowUnit(
  row: undefined | { extraFields?: Record<string, unknown> },
  unitField: string | undefined,
): string {
  if (!unitField || !row?.extraFields) {
    return '';
  }
  const raw = row.extraFields[unitField];
  if (raw === null || raw === undefined) {
    return '';
  }
  return String(raw).trim().replace(/^\//, '');
}

/** 列表展示：有单位拼成 20/hours；无单位只显示金额 */
export function formatAmountWithUnit(
  formattedAmount: string,
  unit: string | undefined,
) {
  if (!formattedAmount || formattedAmount === '—') {
    return formattedAmount || '—';
  }
  const cleaned = (unit ?? '').trim().replace(/^\//, '');
  if (!cleaned) {
    return formattedAmount;
  }
  return `${formattedAmount}/${cleaned}`;
}

/** 导入进 extraFields 的金额常为字符串，展示前统一转成数字 */
export function coerceAmountValue(value: unknown): null | number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value.replaceAll(',', '').trim());
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}
