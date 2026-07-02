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
      state: keys.state ?? '',
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
      snapshot: {
        allInNonOak: row.allInNonOak,
        allInOak: row.allInOak,
        city: row.city,
        fscFreight: row.fsc,
        pol: row.pol,
        por: row.por,
        state: row.state,
        supplier: row.supplier,
        validDate: row.validDate,
      },
    };
  }

  if (type === 'SEA') {
    const row = record as FreightCostRecord;
    return {
      costRefId: row.id,
      costType: 'SEA',
      costVersion: row.validDate ?? row.validFrom,
      matchKeys,
      snapshot: {
        currency: row.currency,
        ofRateUsd: formatSeaOfRate(row),
        pod: row.destination,
        pol: row.origin,
        spec: row.spec,
        ssl: row.carrier,
        unitPrice: row.unitPrice,
        validDate: row.validDate ?? row.validFrom,
      },
    };
  }

  const row = record as FumigationCostRecord;
  return {
    costRefId: row.id,
    costType: 'FUMIGATION',
    costVersion: row.updatedAt,
    matchKeys,
    snapshot: {
      nonOakIndoor: row.nonOakIndoor,
      nonOakOutdoor: row.nonOakOutdoor,
      nonOakQuoteSummer: row.nonOakQuoteSummer,
      nonOakQuoteWinter: row.nonOakQuoteWinter,
      oakIndoor: row.oakIndoor,
      oakOutdoor: row.oakOutdoor,
      oakQuoteSummer: row.oakQuoteSummer,
      oakQuoteWinter: row.oakQuoteWinter,
      port: row.port,
      remark: row.remark,
      station: row.station,
    },
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
