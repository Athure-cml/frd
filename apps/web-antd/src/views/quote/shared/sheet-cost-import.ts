import type {
  FreightCostRecord,
  FumigationCostRecord,
  RoadCostRecord,
} from '#/api/cost';
import type { QuoteApi, QuoteCostType } from '#/api/quote';

import { applyQuoteCostImport } from '#/api/quote';

import { applyFixedTruckExtraFees } from './sheet-truck-extras';

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

/** 引入报价库弹窗默认筛选：生效中 + 未生效（不含待确认；可改筛待确认/已过期仅查看，仍不可引入） */
const PICKER_DEFAULT_STATUS = ['active', 'pending'] as const;

function putTrimmed(
  target: Record<string, string | string[]>,
  field: string,
  value?: string,
  asArray = false,
) {
  const trimmed = value?.trim();
  if (!trimmed) {
    return;
  }
  target[field] = asArray ? [trimmed] : trimmed;
}

export function getInitialSearchValues(
  type: QuoteCostType,
  keys: QuoteMatchKeys,
): Record<string, string | string[]> {
  const status = [...PICKER_DEFAULT_STATUS];
  if (type === 'ROAD') {
    // city 为多选：未填时不要写入 ''，否则会出现空的已选 tag
    const values: Record<string, string | string[]> = { status };
    putTrimmed(values, 'city', keys.city, true);
    putTrimmed(values, 'state', keys.state);
    return values;
  }
  if (type === 'SEA') {
    const values: Record<string, string | string[]> = { status };
    putTrimmed(values, 'por', keys.por);
    putTrimmed(values, 'pol', keys.pol);
    putTrimmed(values, 'pod', keys.pod);
    return values;
  }
  const values: Record<string, string | string[]> = { status };
  putTrimmed(values, 'station', keys.fumigationPoint);
  return values;
}

const ROAD_REMARK_FIELD = 'cf_road_remark';

/** 仅取业务表头 REMARK（cf_road_remark），不回退操作备注。 */
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
  return '';
}

export { formatSeaOfRate } from './sheet-ocean-freight';

function recordSnapshot<T extends Record<string, unknown>>(
  record: T,
): Record<string, unknown> {
  const { id: _id, updatedAt: _updatedAt, ...snapshot } = record;
  return { ...snapshot, fromQuoteLibrary: true };
}

/** 将历史快照字段名对齐报价库列表字段，便于复用同一套列定义 */
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

export function parseValidityEnd(raw: unknown): Date | undefined {
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

/** 多条海运报价取最早有效期结束日（YYYY-MM-DD），供报价单 validUntil 回填 */
export function resolveValidUntilFromSeaRecords(
  records: Array<{ freightValidDate?: null | string }>,
): string | undefined {
  let earliest: Date | undefined;
  for (const record of records) {
    const end = parseValidityEnd(record.freightValidDate);
    if (end && (!earliest || end < earliest)) {
      earliest = end;
    }
  }
  if (!earliest) {
    return undefined;
  }
  const y = earliest.getFullYear();
  const m = String(earliest.getMonth() + 1).padStart(2, '0');
  const d = String(earliest.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
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

/** 待确认不可引入（display 映射后 status 也可能是 pendingConfirm） */
export function isPendingConfirmRecord(
  record: Record<string, unknown>,
): boolean {
  return (
    record.confirmStatus === 'pendingConfirm' ||
    record.status === 'pendingConfirm'
  );
}

export type QuoteLibraryImportBlockReason = 'expired' | 'pendingConfirm';

/** 不可引入时返回原因；可引入返回 null */
export function getQuoteLibraryImportBlockReason(
  type: QuoteCostType,
  record: Record<string, unknown>,
): null | QuoteLibraryImportBlockReason {
  if (isPendingConfirmRecord(record)) {
    return 'pendingConfirm';
  }
  const status = record.status ?? resolveSnapshotStatus(type, record);
  if (status === 'active' || status === 'pending') {
    return null;
  }
  return 'expired';
}

/** 报价引入成本：允许已确认的生效中/未生效；已过期、待确认不可引入 */
export function isActiveCostRecord(
  type: QuoteCostType,
  record: Record<string, unknown>,
): boolean {
  return getQuoteLibraryImportBlockReason(type, record) === null;
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
  oakType?: 'NON_OAK' | 'OAK';
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
    costRefId: record.id,
    costType: type,
    snapshot: recordSnapshot(record as unknown as Record<string, unknown>),
    fumigationEnabled: context.fumigationEnabled,
    fumigationPoint: context.fumigationPoint,
    oakType: context.oakType,
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
  'truckingFee2',
  'truckingNonOakUsd',
  'truckingOakUsd',
  'nsLift',
  'chassis',
  'waiting',
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

/** 取首个非空文本；全空则 undefined（避免空串覆盖已填字段） */
function firstNonBlankText(
  ...values: Array<null | number | string | undefined>
): string | undefined {
  for (const value of values) {
    if (value === null || value === undefined) {
      continue;
    }
    const text = String(value).trim();
    if (text) {
      return text;
    }
  }
  return undefined;
}

function assignSheetTextIfPresent(
  sheet: QuoteApi.QuoteSheetFields,
  key:
    | 'city'
    | 'pod'
    | 'pol'
    | 'por'
    | 'ssl'
    | 'state'
    | 'supplier'
    | 'zipCode',
  ...candidates: Array<null | number | string | undefined>
) {
  const next = firstNonBlankText(...candidates);
  if (next !== undefined) {
    sheet[key] = next;
  }
}

export function mergeRoadCostImport(
  sheet: QuoteApi.QuoteSheetFields,
  fields: QuoteApi.QuoteSheetFields,
  fumigationEnabled: boolean,
  record: RoadCostRecord,
) {
  assignSheetTextIfPresent(sheet, 'por', fields.por, record.por);
  assignSheetTextIfPresent(sheet, 'pol', fields.pol, record.pol);
  assignSheetTextIfPresent(sheet, 'zipCode', fields.zipCode, record.zipCode);
  assignSheetTextIfPresent(sheet, 'city', fields.city, record.city);
  assignSheetTextIfPresent(sheet, 'state', fields.state, record.state);
  assignSheetTextIfPresent(sheet, 'supplier', fields.supplier, record.supplier);
  sheet.pickUpAddress =
    fields.pickUpAddress ||
    record.logYardNameAddress ||
    [sheet.zipCode, sheet.city, sheet.state].filter(Boolean).join(', ') ||
    sheet.pickUpAddress;

  // 卡车额外费用为业务固定值，不从报价库覆盖
  applyFixedTruckExtraFees(sheet);
  sheet.truckRemark =
    fields.truckRemark ?? resolveRoadRemark(record) ?? sheet.truckRemark;
  sheet.truckingFee = fields.truckingFee;
  sheet.truckingNonOakUsd = undefined;
  sheet.truckingOakUsd = undefined;
}

export function mergeSeaCostImport(
  sheet: QuoteApi.QuoteSheetFields,
  fields: QuoteApi.QuoteSheetFields,
  record: FreightCostRecord,
) {
  // 报价库空 POR/POL/POD/SSL 不得覆盖基础信息已填值
  assignSheetTextIfPresent(sheet, 'ssl', fields.ssl, record.ssl);
  assignSheetTextIfPresent(sheet, 'pod', fields.pod, record.pod);
  assignSheetTextIfPresent(sheet, 'pol', fields.pol, record.pol);
  assignSheetTextIfPresent(sheet, 'por', fields.por, record.por);
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
