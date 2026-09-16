import type { SslRemarkLookup } from './quote-sea-ssl-remark';

import type { FreightCostRecord } from '#/api/cost';
import type { QuoteApi } from '#/api/quote';

import {
  resolveSeaRemarkForMatch,
  resolveSeaSslRemark,
} from './quote-sea-ssl-remark';

export const MAX_OCEAN_FREIGHT_LINES = 3;

export interface OceanFreightEntry {
  costRefId?: number;
  rate: string;
  remark: string;
  ssl: string;
}

export function parseOceanFreightLines(value?: string): string[] {
  if (!value?.trim()) {
    return [];
  }
  return value
    .split('/')
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, MAX_OCEAN_FREIGHT_LINES);
}

export function joinOceanFreightLines(lines: string[]): string {
  return lines
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, MAX_OCEAN_FREIGHT_LINES)
    .join('/');
}

export function formatSeaOfRate(
  record: Pick<FreightCostRecord, 'allIn' | 'freight'>,
) {
  const price = record.allIn ?? record.freight;
  if (price === null || price === undefined || Number.isNaN(Number(price))) {
    return '';
  }
  return String(price);
}

export function resolveSeaRemark(
  snapshot?: Record<string, unknown>,
  sslRemarkByName?: SslRemarkLookup,
): string {
  if (!snapshot) {
    return '';
  }
  return resolveSeaSslRemark({ snapshot }, sslRemarkByName);
}

export function formatSeaRateFromSnapshot(
  snapshot?: Record<string, unknown>,
): string {
  if (!snapshot) {
    return '';
  }
  const price = snapshot.allIn ?? snapshot.freight ?? snapshot.baseFreight;
  if (price === null || price === undefined || Number.isNaN(Number(price))) {
    return '';
  }
  return String(price);
}

export function entryFromSeaRecord(
  record: FreightCostRecord,
  sslRemarkByName?: SslRemarkLookup,
): OceanFreightEntry {
  return {
    costRefId: record.id,
    rate: formatSeaOfRate(record),
    remark: resolveSeaSslRemark({ ssl: record.ssl }, sslRemarkByName),
    ssl: record.ssl?.trim() ?? '',
  };
}

export function entryFromSeaMatch(
  match: QuoteApi.QuoteCostMatchItem,
  sslRemarkByName?: SslRemarkLookup,
): OceanFreightEntry {
  const snapshot = match.snapshot ?? {};
  return {
    costRefId: match.costRefId,
    rate: formatSeaRateFromSnapshot(snapshot),
    remark: resolveSeaRemarkForMatch(match, sslRemarkByName),
    ssl: String(snapshot.ssl ?? '').trim(),
  };
}

export function defaultOceanFreightEntry(sheet: {
  oceanFreight?: string;
  ofUsd?: string;
  ssl?: string;
}): OceanFreightEntry {
  const rates = parseOceanFreightLines(sheet.oceanFreight || sheet.ofUsd);
  const sslLines = parseOceanFreightLines(sheet.ssl);
  const sslFallback = sheet.ssl?.trim() ?? '';
  return {
    rate: rates[0] ?? '',
    remark: '',
    ssl: sslLines[0] ?? sslFallback,
  };
}

/** 至少返回一行，便于主费用区展示与编辑 */
export function resolveOceanFreightEntries(
  sheet: { oceanFreight?: string; ofUsd?: string; ssl?: string },
  seaMatches: QuoteApi.QuoteCostMatchItem[],
  sslRemarkByName?: SslRemarkLookup,
): OceanFreightEntry[] {
  const built = buildOceanFreightEntries(sheet, seaMatches, sslRemarkByName);
  if (built.length > 0) {
    return built;
  }
  return [defaultOceanFreightEntry(sheet)];
}

export function buildOceanFreightEntries(
  sheet: { oceanFreight?: string; ofUsd?: string; ssl?: string },
  seaMatches: QuoteApi.QuoteCostMatchItem[],
  sslRemarkByName?: SslRemarkLookup,
): OceanFreightEntry[] {
  const rates = parseOceanFreightLines(sheet.oceanFreight || sheet.ofUsd);
  const ssls = parseOceanFreightLines(sheet.ssl);
  if (rates.length === 0 && seaMatches.length === 0) {
    return [];
  }
  const count = Math.max(rates.length, seaMatches.length);
  const entries: OceanFreightEntry[] = [];
  for (
    let index = 0;
    index < count && index < MAX_OCEAN_FREIGHT_LINES;
    index += 1
  ) {
    const match = seaMatches[index];
    const snapshot = match?.snapshot ?? {};
    const ssl = ssls[index] ?? String(snapshot.ssl ?? '').trim();
    entries.push({
      costRefId: match?.costRefId,
      rate: rates[index] ?? formatSeaRateFromSnapshot(snapshot),
      remark: resolveSeaSslRemark({ ssl, snapshot }, sslRemarkByName),
      ssl,
    });
  }
  return entries;
}

export function syncSheetFromOceanFreightEntries(
  sheet: { oceanFreight?: string; ofUsd?: string; ssl?: string },
  entries: OceanFreightEntry[],
) {
  sheet.oceanFreight = joinOceanFreightLines(
    entries.map((entry) => entry.rate),
  );
  sheet.ofUsd = sheet.oceanFreight;
  sheet.ssl = joinOceanFreightLines(entries.map((entry) => entry.ssl));
}

export function syncSeaMatchRemarks(
  matches: QuoteApi.QuoteCostMatchItem[],
  entries: OceanFreightEntry[],
) {
  const seaMatches = matches.filter((item) => item.costType === 'SEA');
  return matches.map((match) => {
    if (match.costType !== 'SEA') {
      return match;
    }
    const index = seaMatches.findIndex(
      (item) => item.costRefId === match.costRefId,
    );
    const entry = entries[index];
    if (!entry || index === -1) {
      return match;
    }
    return {
      ...match,
      snapshot: {
        ...match.snapshot,
        remark: entry.remark,
        ssl: entry.ssl,
      },
    };
  });
}
