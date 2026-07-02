import type {
  FreightCostRecord,
  FumigationCostRecord,
  RoadCostRecord,
} from '#/api/cost';
import type { QuoteApi, QuoteCostMode, QuoteTransportMode } from '#/api/quote';

export interface QuoteLineExtraJson {
  costSnapshot?: Record<string, unknown>;
  currency?: string;
  priceSource?: string;
  quotedUnitPrice?: number;
}

export interface LineDraft {
  costMode: QuoteCostMode;
  costRefId?: number;
  extraJson?: QuoteLineExtraJson;
  itemName: string;
  key: string;
  quantity: number;
  sort: number;
  spec: string;
  stale?: boolean;
  unit: string;
  unitPrice: number;
}

export type RoadPriceField =
  | 'allIn'
  | 'allInNonOak'
  | 'allInOak'
  | 'baseFreight'
  | 'chassis'
  | 'fsc'
  | 'nsLift'
  | 'owTriAxle'
  | 'prepull'
  | 'redelivery'
  | 'split'
  | 'stopOff'
  | 'waitingFee';

export const DEFAULT_ROAD_PRICE_FIELD: RoadPriceField = 'allIn';

export const ROAD_PRICE_FIELD_OPTIONS: Array<{
  field: RoadPriceField;
  labelKey: string;
}> = [
  { field: 'allIn', labelKey: 'allIn' },
  { field: 'baseFreight', labelKey: 'baseFreight' },
  { field: 'fsc', labelKey: 'fsc' },
  { field: 'chassis', labelKey: 'chassis' },
  { field: 'owTriAxle', labelKey: 'owTriAxle' },
  { field: 'split', labelKey: 'split' },
  { field: 'stopOff', labelKey: 'stopOff' },
  { field: 'allInNonOak', labelKey: 'allInNonOak' },
  { field: 'allInOak', labelKey: 'allInOak' },
  { field: 'waitingFee', labelKey: 'waitingFee' },
  { field: 'redelivery', labelKey: 'redelivery' },
  { field: 'prepull', labelKey: 'prepull' },
  { field: 'nsLift', labelKey: 'nsLift' },
];

const TRANSPORT_COST_MODE: Record<QuoteTransportMode, QuoteCostMode> = {
  RAIL: 'RAIL_REF',
  ROAD: 'ROAD_REF',
  SEA: 'SEA_REF',
};

export function transportToCostMode(mode: QuoteTransportMode): QuoteCostMode {
  return TRANSPORT_COST_MODE[mode];
}

export function createManualLine(sort: number): LineDraft {
  return {
    costMode: 'MANUAL',
    itemName: '',
    key: `line-${Date.now()}-${sort}`,
    quantity: 1,
    sort,
    spec: '',
    unit: '',
    unitPrice: 0,
  };
}

function routeLabel(origin?: string, destination?: string) {
  const from = origin?.trim() || '—';
  const to = destination?.trim() || '—';
  return `${from} → ${to}`;
}

function parseQuotePrice(quote?: string, fallback?: number) {
  if (quote) {
    const match = quote.match(/^\d+(\.\d+)?/);
    if (match) {
      return Number(match[0]);
    }
  }
  return Number(fallback) || 0;
}

export function fumigationToLineDraft(
  record: FumigationCostRecord,
  sort: number,
): LineDraft {
  const unitPrice = parseQuotePrice(
    record.nonOakQuoteSummer,
    record.nonOakOutdoor,
  );
  const itemName = [record.port, record.station].filter(Boolean).join(' / ');
  return {
    costMode: 'RAIL_REF',
    costRefId: record.id,
    extraJson: {
      costSnapshot: {
        id: record.id,
        nonOakOutdoor: record.nonOakOutdoor,
        nonOakQuoteSummer: record.nonOakQuoteSummer,
        oakOutdoor: record.oakOutdoor,
        oakQuoteSummer: record.oakQuoteSummer,
        port: record.port,
        station: record.station,
        updatedAt: record.updatedAt,
      },
      currency: 'USD',
      priceSource: 'nonOakQuoteSummer',
      quotedUnitPrice: unitPrice,
    },
    itemName: itemName || `熏蒸 #${record.id}`,
    key: `line-cost-${record.id}-${Date.now()}-${sort}`,
    quantity: 1,
    sort,
    spec: record.station ?? '',
    unit: '票',
    unitPrice,
  };
}

export function freightToLineDraft(
  record: FreightCostRecord,
  costMode: 'RAIL_REF' | 'SEA_REF',
  sort: number,
): LineDraft {
  const unitPrice = Number(record.unitPrice) || 0;
  return {
    costMode,
    costRefId: record.id,
    extraJson: {
      costSnapshot: {
        carrier: record.carrier,
        destination: record.destination,
        id: record.id,
        origin: record.origin,
        spec: record.spec,
        unit: record.unit,
        unitPrice: record.unitPrice,
        updatedAt: record.updatedAt,
        validFrom: record.validFrom,
        validTo: record.validTo,
      },
      currency: record.currency,
      priceSource: 'unitPrice',
      quotedUnitPrice: unitPrice,
    },
    itemName: routeLabel(record.origin, record.destination),
    key: `line-cost-${record.id}-${Date.now()}-${sort}`,
    quantity: 1,
    sort,
    spec: record.spec ?? '',
    unit: record.unit ?? '',
    unitPrice,
  };
}

export function roadToLineDraft(
  record: RoadCostRecord,
  priceField: RoadPriceField,
  sort: number,
): LineDraft {
  const unitPrice = Number(record[priceField]) || 0;
  const itemName = [record.supplier, record.city, record.pol]
    .filter(Boolean)
    .join(' / ');
  return {
    costMode: 'ROAD_REF',
    costRefId: record.id,
    extraJson: {
      costSnapshot: {
        city: record.city,
        id: record.id,
        pol: record.pol,
        state: record.state,
        supplier: record.supplier,
        updatedAt: record.updatedAt,
        validDate: record.validDate,
        [priceField]: unitPrice,
      },
      currency: 'CNY',
      priceSource: priceField,
      quotedUnitPrice: unitPrice,
    },
    itemName: itemName || record.supplier || `卡车成本 #${record.id}`,
    key: `line-cost-${record.id}-${Date.now()}-${sort}`,
    quantity: 1,
    sort,
    spec: record.state ? `${record.state}` : '',
    unit: '票',
    unitPrice,
  };
}

export function detailLineToDraft(
  line: QuoteApi.QuoteLine,
  index: number,
): LineDraft {
  return {
    costMode: line.costMode ?? 'MANUAL',
    costRefId: line.costRefId,
    extraJson: line.extraJson as QuoteLineExtraJson | undefined,
    itemName: line.itemName,
    key: `line-${line.id ?? index}`,
    quantity: Number(line.quantity),
    sort: line.sort ?? index,
    spec: line.spec ?? '',
    unit: line.unit ?? '',
    unitPrice: Number(line.unitPrice),
  };
}

export function lineDraftToSave(line: LineDraft, index: number) {
  return {
    costMode: line.costMode,
    costRefId: line.costRefId,
    extraJson: line.extraJson,
    itemName: line.itemName.trim(),
    quantity: line.quantity,
    sort: index,
    spec: line.spec.trim() || undefined,
    unit: line.unit.trim() || undefined,
    unitPrice: line.unitPrice,
  };
}

export function isCostLine(line: LineDraft) {
  return line.costMode !== 'MANUAL' && line.costRefId != null;
}

export function isSnapshotStale(
  snapshotUpdatedAt?: string,
  liveUpdatedAt?: string,
) {
  if (!snapshotUpdatedAt || !liveUpdatedAt) {
    return false;
  }
  return snapshotUpdatedAt !== liveUpdatedAt;
}

export function applyFumigationRefresh(
  line: LineDraft,
  record: FumigationCostRecord,
) {
  const refreshed = fumigationToLineDraft(record, line.sort);
  line.itemName = refreshed.itemName;
  line.spec = refreshed.spec;
  line.unit = refreshed.unit;
  line.unitPrice = refreshed.unitPrice;
  line.extraJson = refreshed.extraJson;
  line.stale = false;
}

export function applyFreightRefresh(
  line: LineDraft,
  record: FreightCostRecord,
) {
  const refreshed = freightToLineDraft(
    record,
    line.costMode as 'RAIL_REF' | 'SEA_REF',
    line.sort,
  );
  line.itemName = refreshed.itemName;
  line.spec = refreshed.spec;
  line.unit = refreshed.unit;
  line.unitPrice = refreshed.unitPrice;
  line.extraJson = refreshed.extraJson;
  line.stale = false;
}

export function applyRoadRefresh(
  line: LineDraft,
  record: RoadCostRecord,
  priceField: RoadPriceField = (line.extraJson
    ?.priceSource as RoadPriceField) || DEFAULT_ROAD_PRICE_FIELD,
) {
  const refreshed = roadToLineDraft(record, priceField, line.sort);
  line.itemName = refreshed.itemName;
  line.spec = refreshed.spec;
  line.unit = refreshed.unit;
  line.unitPrice = refreshed.unitPrice;
  line.extraJson = refreshed.extraJson;
  line.stale = false;
}
