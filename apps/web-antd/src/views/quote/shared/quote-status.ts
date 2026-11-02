import type { QuoteStatus } from '#/api/quote';

/** 待报价可编辑 */
export const QUOTE_EDITABLE_STATUSES: QuoteStatus[] = [
  'DRAFT',
  'PENDING_QUOTE',
];

/** 仅待报价可作废（关联询价单一并作废；已报价只能变更） */
export const QUOTE_DELETABLE_STATUSES: QuoteStatus[] = [
  'DRAFT',
  'PENDING_QUOTE',
];

/** @deprecated 退回已取消，保留别名兼容旧引用 */
export const QUOTE_RETURNABLE_STATUSES = QUOTE_DELETABLE_STATUSES;

/** 已结束：作废 / 归档 */
export const QUOTE_ABANDONED_STATUSES: QuoteStatus[] = [
  'REJECTED',
  'EXPIRED',
  'VOIDED',
  'LOST',
  'ARCHIVED',
  'SUPERSEDED',
];

/** 对外四态归一 */
export function normalizeQuoteStatus(status: QuoteStatus): QuoteStatus {
  switch (status) {
    case 'DRAFT':
    case 'PENDING':
    case 'PENDING_APPROVAL': {
      return 'PENDING_QUOTE';
    }
    case 'EFFECTIVE':
    case 'FOLLOWING':
    case 'SENT':
    case 'WON': {
      return 'QUOTED';
    }
    case 'EXPIRED':
    case 'REVISING':
    case 'SUPERSEDED': {
      return 'ARCHIVED';
    }
    case 'LOST':
    case 'REJECTED': {
      return 'VOIDED';
    }
    default: {
      return status;
    }
  }
}

/** 新建页或待报价：可生成报价单 / 引入成本库 */
export function canDraftCostActions(isCreate: boolean, status: QuoteStatus) {
  return isCreate || normalizeQuoteStatus(status) === 'PENDING_QUOTE';
}

export function isQuoteEditable(status: QuoteStatus) {
  return QUOTE_EDITABLE_STATUSES.includes(normalizeQuoteStatus(status));
}

export function isQuoteDeletable(status: QuoteStatus) {
  return QUOTE_DELETABLE_STATUSES.includes(normalizeQuoteStatus(status));
}

/** @deprecated 退回已取消；待报价请用 canShowQuoteVoid */
export function isQuoteReturnable(_status: QuoteStatus) {
  return false;
}

/** 待报价 → 可作废（已报价不可作废，只能变更） */
export function canShowQuoteVoid(status: QuoteStatus) {
  return normalizeQuoteStatus(status) === 'PENDING_QUOTE';
}

/** 已报价 → 可标记成交（兼容旧入口） */
export function canShowQuoteWon(status: QuoteStatus) {
  return normalizeQuoteStatus(status) === 'QUOTED';
}

/** 待报价 → 确认报价 */
export function canShowQuoteConfirm(status: QuoteStatus) {
  return normalizeQuoteStatus(status) === 'PENDING_QUOTE';
}

/** 已报价 → 可变更（不依赖成本异常） */
export function canShowQuoteRevise(
  status: QuoteStatus,
  _costRiskActive?: boolean,
) {
  return normalizeQuoteStatus(status) === 'QUOTED';
}

/** 有效单据上的成本异常：展示为「待报价（异常）」/「已报价（异常）」 */
export function isQuoteStatusAbnormal(
  status: QuoteStatus,
  costRiskActive?: boolean,
) {
  if (costRiskActive !== true) {
    return false;
  }
  const normalized = normalizeQuoteStatus(status);
  return normalized === 'PENDING_QUOTE' || normalized === 'QUOTED';
}

export function isQuoteAbandoned(status: QuoteStatus) {
  return QUOTE_ABANDONED_STATUSES.includes(normalizeQuoteStatus(status));
}
