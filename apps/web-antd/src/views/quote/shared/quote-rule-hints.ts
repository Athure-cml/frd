import type { QuoteRuleApi } from '#/api/quote-rule';

import { $t } from '#/locales';

import { matchesPorInList, parsePorEntries } from './por-list-matcher';

/** 报价单编辑区字段 → 规则目标字段 */
export const SHEET_FIELD_RULE_TARGET = {
  oceanFreight: 'OCEAN_FREIGHT',
  truckingFee: 'TRUCKING_FEE',
  truckingNonOakUsd: 'TRUCKING_FEE',
  truckingOakUsd: 'TRUCKING_FEE',
  fmNonOak: 'FM_NON_OAK',
  fmOak: 'FM_OAK',
  docUsd: 'DOC_FEE',
  cargoInsurancePremium: 'CARGO_INSURANCE',
  cargoAgentFee: 'CARGO_AGENT',
} as const;

export type SheetRuleField = keyof typeof SHEET_FIELD_RULE_TARGET;

export interface QuoteRuleHintContext {
  por?: string;
}

function matchesPorInRule(por: string | undefined, remark: string | undefined) {
  return matchesPorInList(por, remark);
}

function hasMatchingOceanFreightPorIn(
  por: string,
  rules: QuoteRuleApi.QuoteRule[],
) {
  return rules.some(
    (item) =>
      item.targetField === 'OCEAN_FREIGHT' &&
      item.conditionType === 'POR_IN' &&
      matchesPorInRule(por, item.remark),
  );
}

function shouldIncludeRuleForHints(
  rule: QuoteRuleApi.QuoteRule,
  por: string | undefined,
  rules: QuoteRuleApi.QuoteRule[],
) {
  if (rule.targetField !== 'OCEAN_FREIGHT' || !por?.trim()) {
    return true;
  }
  const porInMatched = hasMatchingOceanFreightPorIn(por, rules);
  if (rule.conditionType === 'POR_IN') {
    return matchesPorInRule(por, rule.remark);
  }
  if (rule.conditionType === 'ALWAYS') {
    return !porInMatched;
  }
  return true;
}

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

function formatCondition(rule: QuoteRuleApi.QuoteRule) {
  switch (rule.conditionType) {
    case 'POR_IN': {
      if (!rule.remark?.trim()) {
        return 'POR ∈ …';
      }
      const entries = parsePorEntries(rule.remark);
      return entries.length > 0
        ? `POR ∈ ${entries.join(' / ')}`
        : `POR ∈ ${rule.remark.trim()}`;
    }
    default: {
      return '';
    }
  }
}

export function formatQuoteRuleLine(rule: QuoteRuleApi.QuoteRule) {
  const condition = formatCondition(rule);
  if (condition) {
    return `${rule.name}：${condition} → ${formatCalc(rule)}`;
  }
  return `${rule.name}：${formatCalc(rule)}`;
}

export function buildQuoteRuleHintMap(
  rules: QuoteRuleApi.QuoteRule[],
  context?: QuoteRuleHintContext,
) {
  const grouped: Record<string, string[]> = {};
  for (const rule of rules) {
    if (rule.status !== 1) {
      continue;
    }
    if (!shouldIncludeRuleForHints(rule, context?.por, rules)) {
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

/** 下拉/打印用公式文案：优先 remark，否则按计算参数拼接 */
export function formatQuoteRuleFormulaValue(rule: QuoteRuleApi.QuoteRule) {
  const remark = rule.remark?.trim();
  if (remark) {
    return remark;
  }
  switch (rule.calcType) {
    case 'CIF_MULTIPLY': {
      const factor = rule.cifFactor ?? 1;
      return `CIF *${factor}*${formatPercent(rule.cifRate)}%`;
    }
    case 'CIF_PERCENT': {
      return `CIF*${formatPercent(rule.cifRate)}%`;
    }
    default: {
      return rule.name;
    }
  }
}

export function buildQuoteRuleSelectOptions(
  rules: QuoteRuleApi.QuoteRule[],
  targetField: QuoteRuleApi.TargetField,
) {
  return rules
    .filter((rule) => rule.status === 1 && rule.targetField === targetField)
    .toSorted((a, b) => a.sortOrder - b.sortOrder || a.id - b.id)
    .map((rule) => {
      const formula = formatQuoteRuleFormulaValue(rule);
      return { label: formula, value: formula };
    });
}
