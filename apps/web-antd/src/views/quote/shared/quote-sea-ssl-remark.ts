import type { FreightCostRecord } from '#/api/cost';
import type { QuoteApi } from '#/api/quote';

export type SslRemarkLookup = ReadonlyMap<string, string>;

export function buildShippingLineRemarkLookup(
  lines: Array<{ name: string; remark?: string; shortName?: string }>,
): SslRemarkLookup {
  const map = new Map<string, string>();
  for (const line of lines) {
    const remark = line.remark?.trim();
    if (!remark) {
      continue;
    }
    map.set(line.name.trim(), remark);
    if (line.shortName?.trim()) {
      map.set(line.shortName.trim(), remark);
    }
  }
  return map;
}

function lookupSslRemark(
  ssl: string,
  sslRemarkByName?: SslRemarkLookup,
): string {
  const trimmed = ssl.trim();
  if (!trimmed || !sslRemarkByName) {
    return '';
  }
  if (sslRemarkByName.has(trimmed)) {
    return sslRemarkByName.get(trimmed) ?? '';
  }
  const upper = trimmed.toUpperCase();
  for (const [key, remark] of sslRemarkByName.entries()) {
    if (key.toUpperCase() === upper) {
      return remark;
    }
  }
  return '';
}

/** 海运费 REMARK：按 SSL（船公司）匹配船公司列表备注 */
export function resolveSeaSslRemark(
  source: {
    snapshot?: Record<string, unknown>;
    ssl?: string;
  },
  sslRemarkByName?: SslRemarkLookup,
): string {
  const ssl = String(source.ssl ?? source.snapshot?.ssl ?? '').trim();
  return lookupSslRemark(ssl, sslRemarkByName);
}

export function resolveSeaRemarkForRecord(
  record: Pick<FreightCostRecord, 'ssl'>,
  sslRemarkByName?: SslRemarkLookup,
): string {
  return resolveSeaSslRemark({ ssl: record.ssl }, sslRemarkByName);
}

export function resolveSeaRemarkForMatch(
  match: QuoteApi.QuoteCostMatchItem,
  sslRemarkByName?: SslRemarkLookup,
): string {
  return resolveSeaSslRemark(
    { snapshot: match.snapshot ?? {} },
    sslRemarkByName,
  );
}
