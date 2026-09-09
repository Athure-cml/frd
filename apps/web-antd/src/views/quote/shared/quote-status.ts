import type { QuoteStatus } from '#/api/quote';

/** 草稿可编辑 */
export const QUOTE_EDITABLE_STATUSES: QuoteStatus[] = ['DRAFT'];

/** 草稿、已作废可删除 */
export const QUOTE_DELETABLE_STATUSES: QuoteStatus[] = ['DRAFT', 'VOIDED'];

/** 已放弃：拒绝 / 过期 / 作废 */
export const QUOTE_ABANDONED_STATUSES: QuoteStatus[] = [
  'REJECTED',
  'EXPIRED',
  'VOIDED',
  'LOST',
];

export function normalizeQuoteStatus(status: QuoteStatus): QuoteStatus {
  switch (status) {
    case 'EFFECTIVE':
    case 'FOLLOWING': {
      return 'SENT';
    }
    case 'LOST': {
      return 'REJECTED';
    }
    case 'PENDING': {
      return 'PENDING_APPROVAL';
    }
    default: {
      return status;
    }
  }
}

/** 新建页或草稿：可生成报价单 / 引入成本库 */
export function canDraftCostActions(isCreate: boolean, status: QuoteStatus) {
  return isCreate || normalizeQuoteStatus(status) === 'DRAFT';
}

export function isQuoteEditable(status: QuoteStatus) {
  return QUOTE_EDITABLE_STATUSES.includes(normalizeQuoteStatus(status));
}

export function isQuoteDeletable(status: QuoteStatus) {
  return QUOTE_DELETABLE_STATUSES.includes(normalizeQuoteStatus(status));
}

/** 非草稿、非待审批、非已放弃、非成交 → 可作废 */
export function canShowQuoteVoid(status: QuoteStatus) {
  const normalized = normalizeQuoteStatus(status);
  return (
    normalized !== 'DRAFT' &&
    normalized !== 'PENDING_APPROVAL' &&
    !isQuoteAbandoned(status) &&
    normalized !== 'WON'
  );
}

export function isQuoteAbandoned(status: QuoteStatus) {
  return QUOTE_ABANDONED_STATUSES.includes(normalizeQuoteStatus(status));
}
