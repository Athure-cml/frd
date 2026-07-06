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
  zipCode?: string;
}

export function getInitialSearchValues(
  type: QuoteCostType,
  keys: QuoteMatchKeys,
): Record<string, string> {
  if (type === 'ROAD') {
    return {
      city: keys.city ?? '',
      pol: keys.pol ?? '',
      por: keys.por ?? '',
      state: keys.state ?? '',
      zipCode: keys.zipCode ?? '',
    };
  }
  if (type === 'SEA') {
    return {
      carrier: keys.ssl ?? '',
      destination: keys.pod ?? '',
      origin: keys.pol ?? '',
    };
  }
  return {
    port: keys.pod ?? '',
  };
}

function formatSeaOfRate(record: FreightCostRecord): string {
  const price = record.allIn ?? record.unitPrice;
  if (price == null || Number.isNaN(Number(price))) {
    return '';
  }
  const denom = record.spec?.trim() || record.unit?.trim();
  return denom ? `${price}/${denom}` : String(price);
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
  if (type === 'ROAD') {
    return {
      id: costRefId,
      allIn: snapshot.allIn,
      allInNonOak: snapshot.allInNonOak,
      allInOak: snapshot.allInOak,
      baseFreight: snapshot.baseFreight,
      chassis: snapshot.chassis,
      city: snapshot.city,
      extraFields: snapshot.extraFields,
      fsc: snapshot.fsc ?? snapshot.fscFreight,
      logYardNameAddress: snapshot.logYardNameAddress,
      nsLift: snapshot.nsLift,
      owTriAxle: snapshot.owTriAxle,
      pol: snapshot.pol,
      por: snapshot.por,
      prepull: snapshot.prepull,
      redelivery: snapshot.redelivery,
      remark: snapshot.remark,
      split: snapshot.split,
      state: snapshot.state,
      stopOff: snapshot.stopOff,
      supplier: snapshot.supplier,
      validDate: snapshot.validDate,
      waitingFee: snapshot.waitingFee,
      zipCode: snapshot.zipCode,
    };
  }

  if (type === 'SEA') {
    return {
      id: costRefId,
      allIn: snapshot.allIn,
      buc: snapshot.buc,
      carrier: snapshot.carrier ?? snapshot.ssl,
      currency: snapshot.currency,
      destination: snapshot.destination ?? snapshot.pod,
      extraFields: snapshot.extraFields,
      origin: snapshot.origin ?? snapshot.pol,
      remark: snapshot.remark,
      spec: snapshot.spec,
      status: snapshot.status,
      surchargeValidDate: snapshot.surchargeValidDate,
      unit: snapshot.unit,
      unitPrice: snapshot.unitPrice,
      validDate: snapshot.validDate,
      validFrom: snapshot.validFrom,
      validTo: snapshot.validTo,
    };
  }

  return {
    id: costRefId,
    extraFields: snapshot.extraFields,
    nonOakIndoor: snapshot.nonOakIndoor,
    nonOakOutdoor: snapshot.nonOakOutdoor,
    nonOakQuoteSummer: snapshot.nonOakQuoteSummer,
    nonOakQuoteWinter: snapshot.nonOakQuoteWinter,
    oakIndoor: snapshot.oakIndoor,
    oakOutdoor: snapshot.oakOutdoor,
    oakQuoteSummer: snapshot.oakQuoteSummer,
    oakQuoteWinter: snapshot.oakQuoteWinter,
    port: snapshot.port,
    remark: snapshot.remark,
    station: snapshot.station,
    updatedAt: snapshot.updatedAt,
  };
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
      costVersion: row.validDate ?? row.validFrom,
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
    sheet.truckingNonOakUsd = row.allInNonOak;
    sheet.truckingOakUsd = row.allInOak;
    sheet.fmNonOak = row.fsc;
    sheet.fmOak = row.fsc;
    return;
  }

  if (type === 'SEA') {
    const row = record as FreightCostRecord;
    sheet.ofUsd = formatSeaOfRate(row);
    sheet.ssl = row.carrier;
  }
}
