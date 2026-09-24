import type {
  FreightCostRecord,
  FumigationCostRecord,
  RoadCostRecord,
} from '#/api/cost';
import type { QuoteApi, QuoteCostType } from '#/api/quote';

import { applyQuoteCostImport } from '#/api/quote';

export type CostLibraryRecord =
  | FreightCostRecord
  | FumigationCostRecord
  | RoadCostRecord;

export interface QuoteMatchKeys {
  city?: string;
  fumigationPoint?: string;
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
      state: keys.state ?? '',
    };
  }
  if (type === 'SEA') {
    return {
      por: keys.por ?? '',
      pol: keys.pol ?? '',
      pod: keys.pod ?? '',
    };
  }
  return {
    station: keys.fumigationPoint ?? '',
  };
}

const ROAD_REMARK_FIELD = 'cf_road_remark';

export function resolveRoadRemark(
  record: Pick<RoadCostRecord, 'extraFields' | 'remark'>,
): string {
  const extra = record.extraFields;
  if (extra && typeof extra === 'object' && !Array.isArray(extra)) {
    const custom = (extra as Record<string, unknown>)[ROAD_REMARK_FIELD];
    if (custom !== null && custom !== undefined && String(custom).trim()) {
      return String(custom).trim();
    }
  }
  return record.remark?.trim() ?? '';
}

export { formatSeaOfRate } from './sheet-ocean-freight';

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

export interface CostImportContext {
  cifAmount?: number;
  fumigationEnabled?: boolean;
  fumigationPoint?: string;
  pod?: string;
  por?: string;
  quoteDate?: string;
}

export async function fetchCostImportFields(
  type: QuoteCostType,
  record: CostLibraryRecord,
  context: CostImportContext,
): Promise<QuoteApi.QuoteSheetFields> {
  const { fields } = await applyQuoteCostImport({
    costType: type,
    snapshot: recordSnapshot(record as unknown as Record<string, unknown>),
    fumigationEnabled: context.fumigationEnabled,
    fumigationPoint: context.fumigationPoint,
    pod: context.pod,
    por: context.por,
    cifAmount: context.cifAmount,
    quoteDate: context.quoteDate,
  });
  return fields;
}

const ROAD_SHEET_PRESERVE_KEYS = [
  'zipCode',
  'city',
  'state',
  'supplier',
  'pickUpAddress',
  'truckingFee',
  'truckingNonOakUsd',
  'truckingOakUsd',
  'nsLift',
  'chassis',
  'waiting',
  'redeliveryFee',
  'truckRemark',
] as const satisfies ReadonlyArray<keyof QuoteApi.QuoteSheetFields>;

/** 匹配报价时已引入卡车成本：保留这些 sheet 字段不被覆盖 */
export function pickRoadSheetFields(
  sheet: QuoteApi.QuoteSheetFields,
): Partial<QuoteApi.QuoteSheetFields> {
  const picked: Partial<QuoteApi.QuoteSheetFields> = {};
  for (const key of ROAD_SHEET_PRESERVE_KEYS) {
    const value = sheet[key];
    if (value !== undefined && value !== null && value !== '') {
      picked[key] = value;
    }
  }
  return picked;
}

export function mergeRoadCostImport(
  sheet: QuoteApi.QuoteSheetFields,
  fields: QuoteApi.QuoteSheetFields,
  fumigationEnabled: boolean,
  record: RoadCostRecord,
) {
  sheet.por = fields.por ?? record.por ?? sheet.por;
  sheet.pol = fields.pol ?? record.pol ?? sheet.pol;
  sheet.zipCode = fields.zipCode ?? record.zipCode ?? sheet.zipCode;
  sheet.city = fields.city ?? record.city ?? sheet.city;
  sheet.state = fields.state ?? record.state ?? sheet.state;
  sheet.supplier = fields.supplier ?? record.supplier ?? sheet.supplier;
  sheet.pickUpAddress =
    fields.pickUpAddress ||
    record.logYardNameAddress ||
    [sheet.zipCode, sheet.city, sheet.state].filter(Boolean).join(', ') ||
    sheet.pickUpAddress;

  if (fields.nsLift !== undefined && fields.nsLift !== null) {
    sheet.nsLift = fields.nsLift;
  }
  if (fields.chassis !== undefined && fields.chassis !== null) {
    sheet.chassis = fields.chassis;
  }
  if (fields.waiting !== undefined && fields.waiting !== null) {
    sheet.waiting = fields.waiting;
  }
  if (fields.redeliveryFee !== undefined && fields.redeliveryFee !== null) {
    sheet.redeliveryFee = fields.redeliveryFee;
  }
  sheet.truckRemark =
    fields.truckRemark ?? resolveRoadRemark(record) ?? sheet.truckRemark;

  if (fumigationEnabled) {
    sheet.truckingNonOakUsd = fields.truckingNonOakUsd;
    sheet.truckingOakUsd = fields.truckingOakUsd;
    sheet.truckingFee = undefined;
  } else {
    sheet.truckingFee = fields.truckingFee;
    sheet.truckingNonOakUsd = undefined;
    sheet.truckingOakUsd = undefined;
  }
}

export function mergeSeaCostImport(
  sheet: QuoteApi.QuoteSheetFields,
  fields: QuoteApi.QuoteSheetFields,
  record: FreightCostRecord,
) {
  sheet.ssl = fields.ssl ?? record.ssl ?? sheet.ssl;
  sheet.pod = fields.pod ?? record.pod ?? sheet.pod;
  sheet.pol = fields.pol ?? record.pol ?? sheet.pol;
  sheet.por = fields.por ?? record.por ?? sheet.por;
}

export function mergeFumigationCostImport(
  sheet: QuoteApi.QuoteSheetFields,
  fields: QuoteApi.QuoteSheetFields,
) {
  if (fields.fmNonOak !== undefined && fields.fmNonOak !== null) {
    sheet.fmNonOak = fields.fmNonOak;
  }
  if (fields.fmOak !== undefined && fields.fmOak !== null) {
    sheet.fmOak = fields.fmOak;
  }
}

/** @deprecated 请使用 fetchCostImportFields + merge*CostImport */
export function applyCostToSheet(
  sheet: QuoteApi.QuoteSheetFields,
  type: QuoteCostType,
  record: CostLibraryRecord,
) {
  if (type === 'ROAD') {
    mergeRoadCostImport(
      sheet,
      {
        truckingFee: (record as RoadCostRecord).allInNoFm,
        truckingNonOakUsd: (record as RoadCostRecord).allInFmOneWay,
        truckingOakUsd: (record as RoadCostRecord).allInFmRound,
      },
      Boolean(sheet.fumigationEnabled),
      record as RoadCostRecord,
    );
    return;
  }
  if (type === 'SEA') {
    mergeSeaCostImport(sheet, {}, record as FreightCostRecord);
  }
}
