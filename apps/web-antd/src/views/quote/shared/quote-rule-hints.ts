import type { QuoteRuleApi } from '#/api/quote-rule';

import { $t } from '#/locales';

/** 报价单编辑区字段 → 规则目标字段 */
export const SHEET_FIELD_RULE_TARGET = {
  oceanFreight: 'OCEAN_FREIGHT',
  truckingFee: 'TRUCKING_FEE',
  fmNonOak: 'FM_NON_OAK',
  fmOak: 'FM_OAK',
  docUsd: 'DOC_FEE',
  cargoInsurancePremium: 'CARGO_INSURANCE',
  cargoAgentFee: 'CARGO_AGENT',
} as const;

export type SheetRuleField = keyof typeof SHEET_FIELD_RULE_TARGET;

function formatPercent(rate?: number) {
  if (rate === null || rate === undefined) {
    return '';
  }
  return Number((rate * 100).toFixed(6)).toString();
}

function formatCalc(rule: QuoteRuleApi.QuoteRule) {
  switch (rule.calcType) {
    case 'CIF_MULTIPLY': {
      return `CIF × ${rule.cifFactor ?? 1} × ${formatPercent(rule.cifRate)}%`;
    }
    case 'CIF_PERCENT': {
      return `CIF × ${formatPercent(rule.cifRate)}%`;
    }
    case 'COST_PLUS': {
      return `${$t('page.quote.ruleHint.cost')} + ${rule.addAmount ?? 0}`;
    }
    case 'FIXED': {
      return String(rule.fixedAmount ?? 0);
    }
    default: {
      return rule.name;
    }
  }
}

export function formatQuoteRuleLine(rule: QuoteRuleApi.QuoteRule) {
  return `${rule.name}：${formatCalc(rule)}`;
}

export function buildQuoteRuleHintMap(rules: QuoteRuleApi.QuoteRule[]) {
  const grouped: Record<string, string[]> = {};
  for (const rule of rules) {
    if (rule.status !== 1) {
      continue;
    }
    (grouped[rule.targetField] ??= []).push(formatQuoteRuleLine(rule));
  }
  const map: Record<string, string> = {};
  for (const [targetField, lines] of Object.entries(grouped)) {
    map[targetField] = lines.join('\n');
  }
  return map;
}

export function hintForSheetField(
  map: Record<string, string>,
  field: SheetRuleField,
) {
  return map[SHEET_FIELD_RULE_TARGET[field]];
}
