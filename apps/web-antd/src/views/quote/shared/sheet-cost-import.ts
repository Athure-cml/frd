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
      pol: keys.pol ?? '',
      por: keys.por ?? '',
      state: keys.state ?? '',
      supplier: keys.supplier ?? '',
      zipCode: keys.zipCode ?? '',
    };
  }
  if (type === 'SEA') {
    return {
      carrier: keys.ssl ?? '',
      destination: keys.pod ?? '',
      origin: keys.pol ?? '',
      pod: keys.pod ?? '',
      pol: keys.pol ?? '',
      por: keys.por ?? '',
      ssl: keys.ssl ?? '',
    };
  }
  return {
    port: keys.pod ?? '',
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
  if (type === 'ROAD') {
    return {
      id: costRefId,
      allInFmOneWay:
        snapshot.allInFmOneWay ?? snapshot.allInOak ?? snapshot.allIn,
      allInFmRound: snapshot.allInFmRound ?? snapshot.allIn,
      allInNoFm: snapshot.allInNoFm ?? snapshot.allInNonOak ?? snapshot.allIn,
      baseFreight: snapshot.baseFreight,
      chassis: snapshot.chassis,
      city: snapshot.city,
      extraFields: snapshot.extraFields,
      fsc: snapshot.fsc ?? snapshot.psc,
      logYardNameAddress: snapshot.logYardNameAddress,
      otherFee: snapshot.otherFee ?? snapshot.otrwFee,
      pol: snapshot.pol,
      por: snapshot.por ?? snapshot.city,
      prepull: snapshot.prepull,
      redelivery: snapshot.redelivery,
      remark: snapshot.remark,
      split: snapshot.split,
      state: snapshot.state,
      stopOff: snapshot.stopOff ?? snapshot.stopsFf,
      supplier: snapshot.supplier,
      nsLift: snapshot.nsLift ?? snapshot.toLift ?? snapshot.usLift,
      triTandemAxle:
        snapshot.triTandemAxle ?? snapshot.owTriAxle ?? snapshot.overweight,
      validDate: snapshot.validDate,
      waitingFee: snapshot.waitingFee,
      zipCode: snapshot.zipCode,
    };
  }

  if (type === 'SEA') {
    return {
      id: costRefId,
      agent: snapshot.agent,
      allIn: snapshot.allIn,
      buc: snapshot.buc,
      bucValidDate: snapshot.bucValidDate,
      cnShortName: snapshot.cnShortName,
      containerType: snapshot.containerType,
      ebs: snapshot.ebs,
      ebsValidDate: snapshot.ebsValidDate,
      enProductName: snapshot.enProductName,
      extraFields: snapshot.extraFields,
      freight: snapshot.freight ?? snapshot.baseFreight ?? snapshot.unitPrice,
      freightValidDate: snapshot.freightValidDate ?? snapshot.validDate,
      gri: snapshot.gri,
      griValidDate: snapshot.griValidDate,
      others: snapshot.others,
      othersValidDate: snapshot.othersValidDate,
      pod: (snapshot.pod ?? snapshot.destination) as string,
      pol: (snapshot.pol ?? snapshot.origin) as string,
      por: snapshot.por,
      remark: snapshot.remark,
      ssl: (snapshot.ssl ?? snapshot.carrier ?? snapshot.supplier) as string,
      updatedAt: snapshot.updatedAt as string | undefined,
    };
  }

  return {
    id: costRefId,
    address: snapshot.address,
    extraFields: snapshot.extraFields,
    indoorNonOak: snapshot.indoorNonOak,
    indoorOak: snapshot.indoorOak,
    indoorValidity: snapshot.indoorValidity,
    outdoorNonOak: snapshot.outdoorNonOak,
    outdoorOak: snapshot.outdoorOak,
    outdoorValidity: snapshot.outdoorValidity,
    region: (snapshot.region ?? snapshot.port) as string,
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
    sheet.truckingNonOakUsd = row.allInNoFm;
    sheet.truckingOakUsd = row.allInFmOneWay;
    return;
  }

  if (type === 'SEA') {
    const row = record as FreightCostRecord;
    sheet.ofUsd = formatSeaOfRate(row);
    sheet.ssl = row.ssl;
  }
}
