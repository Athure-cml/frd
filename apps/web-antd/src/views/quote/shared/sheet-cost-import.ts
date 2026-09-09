import type {
  FreightCostRecord,
  FumigationCostRecord,
  RoadCostRecord,
} from '#/api/cost';
import type { QuoteApi, QuoteCostType } from '#/api/quote';

export type CostLibraryRecord =
  | FreightCostRecord
  | FumigationCostRecord
  | RoadCostRecord;

export interface QuoteMatchKeys {
  city?: string;
  pod?: string;
  pol?: string;
  por?: string;
  ssl?: string;
  state?: string;
  supplier?: string;
  zipCode?: string;
}

export function getInitialSearchValues(
  type: QuoteCostType,
  keys: QuoteMatchKeys,
): Record<string, string> {
  if (type === 'ROAD') {
    return {
      city: keys.city ?? '',
      por: keys.por ?? '',
      state: keys.state ?? '',
      supplier: keys.supplier ?? '',
      zipCode: keys.zipCode ?? '',
    };
  }
  if (type === 'SEA') {
    return {
      pod: keys.pod ?? '',
      pol: keys.pol ?? '',
      por: keys.por ?? '',
      ssl: keys.ssl ?? '',
    };
  }
  return {
    region: keys.pod ?? '',
  };
}

function formatSeaOfRate(record: FreightCostRecord): string {
  const price = record.allIn ?? record.freight;
  if (price === null || price === undefined || Number.isNaN(Number(price))) {
    return '';
  }
  return String(price);
}

function recordSnapshot<T extends Record<string, unknown>>(
  record: T,
): Record<string, unknown> {
  const { id: _id, updatedAt: _updatedAt, ...snapshot } = record;
  return { ...snapshot };
}

/** 将历史快照字段名对齐成本库列表字段，便于复用同一套列定义 */
export function normalizeSnapshotRow(
  type: QuoteCostType,
  snapshot: Record<string, unknown> = {},
  costRefId: number,
): Record<string, unknown> {
  const base: Record<string, unknown> = { ...snapshot, id: costRefId };

  if (type === 'ROAD') {
    return {
      ...base,
      allInFmOneWay: base.allInFmOneWay ?? base.allInOak ?? base.allIn,
      allInFmRound: base.allInFmRound ?? base.allIn,
      allInNoFm: base.allInNoFm ?? base.allInNonOak ?? base.allIn,
      fsc: base.fsc ?? base.psc,
      otherFee: base.otherFee ?? base.otrwFee,
      por: base.por ?? base.city,
      stopOff: base.stopOff ?? base.stopsFf,
      nsLift: base.nsLift ?? base.toLift ?? base.usLift,
      triTandemAxle: base.triTandemAxle ?? base.owTriAxle ?? base.overweight,
      status: base.status ?? resolveSnapshotStatus(type, base),
    };
  }

  if (type === 'SEA') {
    return {
      ...base,
      freight: base.freight ?? base.baseFreight ?? base.unitPrice,
      freightValidDate: base.freightValidDate ?? base.validDate,
      pod: (base.pod ?? base.destination) as string,
      pol: (base.pol ?? base.origin) as string,
      ssl: (base.ssl ?? base.carrier ?? base.supplier) as string,
      status: base.status ?? resolveSnapshotStatus(type, base),
    };
  }

  return {
    ...base,
    region: (base.region ?? base.port) as string,
    status: base.status ?? resolveSnapshotStatus(type, base),
  };
}

function parseValidityEnd(raw: unknown): Date | undefined {
  if (raw === null || raw === undefined || raw === '') {
    return undefined;
  }
  const text = String(raw).trim();
  const range = text.match(
    /^(\d{4}[/.-]\d{1,2}[/.-]\d{1,2})\s*[-–—~至到]\s*(\d{4}[/.-]\d{1,2}[/.-]\d{1,2})$/,
  );
  const dateText = range?.[2] ?? text;
  const normalized = dateText.replaceAll('.', '-').replaceAll('/', '-');
  const parsed = Date.parse(normalized);
  if (Number.isNaN(parsed)) {
    return undefined;
  }
  const date = new Date(parsed);
  date.setHours(0, 0, 0, 0);
  return date;
}

function parseEffectiveStart(raw: unknown): Date | undefined {
  if (raw === null || raw === undefined || raw === '') {
    return undefined;
  }
  const text = String(raw).trim();
  const range = text.match(
    /^(\d{4}[/.-]\d{1,2}[/.-]\d{1,2})\s*[-–—~至到]\s*(\d{4}[/.-]\d{1,2}[/.-]\d{1,2})$/,
  );
  const dateText = range?.[1] ?? text;
  const normalized = dateText.replaceAll('.', '-').replaceAll('/', '-');
  const parsed = Date.parse(normalized);
  if (Number.isNaN(parsed)) {
    return undefined;
  }
  const date = new Date(parsed);
  date.setHours(0, 0, 0, 0);
  return date;
}

function readRoadEffective(row: Record<string, unknown>): unknown {
  const extra = row.extraFields;
  if (extra && typeof extra === 'object' && !Array.isArray(extra)) {
    return (extra as Record<string, unknown>).cf_road_eff;
  }
  return undefined;
}

/** 旧快照无 status 时，按生效期+有效期推算（与成本库 active/pending/expired 一致） */
function resolveSnapshotStatus(
  type: QuoteCostType,
  row: Record<string, unknown>,
): 'active' | 'expired' | 'pending' | undefined {
  const effectiveTexts: unknown[] =
    type === 'ROAD' ? [readRoadEffective(row)] : [];
  const validityTexts: unknown[] =
    type === 'ROAD'
      ? [row.validDate]
      : type === 'SEA'
        ? [row.freightValidDate]
        : [row.outdoorValidity, row.indoorValidity];

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (const text of effectiveTexts) {
    const start = parseEffectiveStart(text);
    if (start && start > today) {
      return 'pending';
    }
  }

  let latestEnd: Date | undefined;
  for (const text of validityTexts) {
    const end = parseValidityEnd(text);
    if (end && (!latestEnd || end > latestEnd)) {
      latestEnd = end;
    }
  }
  if (!latestEnd) {
    return undefined;
  }
  return latestEnd < today ? 'expired' : 'active';
}

/** 报价引入成本：仅允许生效中记录 */
export function isActiveCostRecord(
  type: QuoteCostType,
  record: Record<string, unknown>,
): boolean {
  const status = record.status ?? resolveSnapshotStatus(type, record);
  return status === 'active';
}

export function recordToCostMatchItem(
  type: QuoteCostType,
  record: CostLibraryRecord,
  matchKeys: QuoteMatchKeys,
): QuoteApi.QuoteCostMatchItem {
  if (type === 'ROAD') {
    const row = record as RoadCostRecord;
    return {
      costRefId: row.id,
      costType: 'ROAD',
      costVersion: row.validDate,
      matchKeys,
      snapshot: recordSnapshot(row as unknown as Record<string, unknown>),
    };
  }

  if (type === 'SEA') {
    const row = record as FreightCostRecord;
    return {
      costRefId: row.id,
      costType: 'SEA',
      costVersion: row.freightValidDate,
      matchKeys,
      snapshot: recordSnapshot(row as unknown as Record<string, unknown>),
    };
  }

  const row = record as FumigationCostRecord;
  return {
    costRefId: row.id,
    costType: 'FUMIGATION',
    costVersion: row.updatedAt,
    matchKeys,
    snapshot: recordSnapshot(row as unknown as Record<string, unknown>),
  };
}

export function applyCostToSheet(
  sheet: QuoteApi.QuoteSheetFields,
  type: QuoteCostType,
  record: CostLibraryRecord,
) {
  if (type === 'ROAD') {
    const row = record as RoadCostRecord;
    sheet.truckingFee = row.allInNoFm;
    sheet.truckingNonOakUsd = row.allInNoFm;
    sheet.truckingOakUsd = row.allInFmOneWay;
    sheet.nsLift = row.nsLift;
    sheet.chassis = row.chassis;
    sheet.waiting = row.waitingFee;
    sheet.redeliveryFee = row.redelivery;
    sheet.truckRemark = row.remark;
    sheet.por = row.por ?? sheet.por;
    sheet.pol = row.pol ?? sheet.pol;
    sheet.zipCode = row.zipCode ?? sheet.zipCode;
    sheet.city = row.city ?? sheet.city;
    sheet.state = row.state ?? sheet.state;
    sheet.pickUpAddress =
      row.logYardNameAddress ||
      [sheet.zipCode, sheet.city, sheet.state].filter(Boolean).join(', ') ||
      sheet.pickUpAddress;
    return;
  }

  if (type === 'SEA') {
    const row = record as FreightCostRecord;
    sheet.oceanFreight = formatSeaOfRate(row);
    sheet.ofUsd = sheet.oceanFreight;
    sheet.ssl = row.ssl;
    sheet.pod = row.pod ?? sheet.pod;
    sheet.pol = row.pol ?? sheet.pol;
    sheet.por = row.por ?? sheet.por;
  }
}
