import type { QuoteApi } from '#/api/quote';

import { $t } from '#/locales';

const MODE_ORDER = ['road', 'sea', 'fumigation'] as const;

export type CostRiskMode = (typeof MODE_ORDER)[number];

const LIBRARY_I18N: Record<CostRiskMode, string> = {
  road: 'page.quote.risk.libraryRoad',
  sea: 'page.quote.risk.librarySea',
  fumigation: 'page.quote.risk.libraryFumigation',
};

const HINT_I18N: Record<CostRiskMode, string> = {
  road: 'page.quote.risk.hintRoad',
  sea: 'page.quote.risk.hintSea',
  fumigation: 'page.quote.risk.hintFumigation',
};

function normalizeModeToken(token: string): CostRiskMode | null {
  const value = token.trim().toLowerCase();
  if (value === 'road') return 'road';
  if (value === 'sea') return 'sea';
  if (value === 'fumigation') return 'fumigation';
  if (token.includes('卡车')) return 'road';
  if (token.includes('海运')) return 'sea';
  if (token.includes('熏蒸')) return 'fumigation';
  return null;
}

export function parseCostRiskModes(reason?: null | string): CostRiskMode[] {
  if (!reason?.trim()) {
    return [];
  }
  const modes = new Set<CostRiskMode>();
  for (const part of reason.split(/[,;，；]+/)) {
    const mode = normalizeModeToken(part);
    if (mode) {
      modes.add(mode);
    }
  }
  if (modes.size === 0) {
    const whole = normalizeModeToken(reason);
    if (whole) {
      modes.add(whole);
    }
  }
  return MODE_ORDER.filter((mode) => modes.has(mode));
}

function normalizeModesInput(
  modes?: Array<CostRiskMode | string> | null,
): CostRiskMode[] {
  if (!modes?.length) {
    return [];
  }
  const resolved = new Set<CostRiskMode>();
  for (const item of modes) {
    const mode = normalizeModeToken(String(item));
    if (mode) {
      resolved.add(mode);
    }
  }
  return MODE_ORDER.filter((mode) => resolved.has(mode));
}

function resolveCostRiskModes(options?: {
  modes?: Array<CostRiskMode | string> | null;
  reason?: null | string;
}): CostRiskMode[] {
  const fromModes = normalizeModesInput(options?.modes);
  if (fromModes.length > 0) {
    return fromModes;
  }
  return parseCostRiskModes(options?.reason);
}

export function formatQuoteCostRiskHint(options?: {
  modes?: Array<CostRiskMode | string> | null;
  reason?: null | string;
}): string {
  const resolvedModes = resolveCostRiskModes(options);

  if (resolvedModes.length === 1) {
    const mode = resolvedModes[0];
    return mode ? $t(HINT_I18N[mode]) : $t('page.quote.risk.hintDefault');
  }
  if (resolvedModes.length > 1) {
    const names = resolvedModes
      .map((mode) => $t(LIBRARY_I18N[mode]))
      .join('、');
    return $t('page.quote.risk.hintMultiple', [names]);
  }
  return $t('page.quote.risk.hintDefault');
}

export function formatQuoteCostRiskHintFromDetail(
  detail?: null | Pick<
    QuoteApi.QuoteDetail,
    'costRiskModes' | 'costRiskReason'
  >,
): string {
  return formatQuoteCostRiskHint({
    modes: detail?.costRiskModes,
    reason: detail?.costRiskReason,
  });
}
