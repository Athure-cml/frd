import type { LineDraft, QuoteLineExtraJson } from './cost-mapping';

import type { QuoteApi } from '#/api/quote';

import { isCostLine } from './cost-mapping';
import { FIXED_TRUCK_REDELIVERY_RATE } from './sheet-truck-extras';

/** 客户交付 Excel 一行（与报价单列表多选导出模板一致） */
export interface QuoteExportRow {
  city?: string;
  docUsd?: string;
  fmNonOak?: number | string;
  fmOak?: number | string;
  oakType?: string;
  oceanFreight?: string;
  pod?: string;
  pol?: string;
  por?: string;
  remark?: string;
  ssl?: string;
  state?: string;
  truckingFee?: string;
  validUntil?: string;
  zipCode?: string;
}

export interface QuoteExportColumn {
  field: keyof QuoteExportRow;
  /** Excel 第 1 行表头（与业务模板一致） */
  header: string;
  width?: number;
}

/** 固定列序 — 与业务「报价单列表多选导出模板」一致 */
export const QUOTE_EXPORT_COLUMNS: QuoteExportColumn[] = [
  { field: 'zipCode', header: 'Zip code', width: 10 },
  { field: 'city', header: 'City', width: 14 },
  { field: 'state', header: 'State', width: 8 },
  { field: 'oakType', header: 'OAK / NON-OAK', width: 14 },
  { field: 'por', header: 'POR', width: 12 },
  { field: 'pol', header: 'POL', width: 12 },
  { field: 'pod', header: 'POD', width: 10 },
  { field: 'oceanFreight', header: 'Ocean Freight', width: 16 },
  { field: 'ssl', header: 'SSL', width: 18 },
  { field: 'truckingFee', header: 'Trucking fee', width: 14 },
  { field: 'fmNonOak', header: 'FM(NON-OAK)', width: 12 },
  { field: 'fmOak', header: 'FM(OAK)', width: 12 },
  { field: 'docUsd', header: 'DOC', width: 12 },
  { field: 'validUntil', header: 'VALID UNTIL', width: 14 },
  { field: 'remark', header: 'REMARK', width: 48 },
];

/** 业务提供的样本行，用于导出预览与单测 */
export const QUOTE_EXPORT_SAMPLE_ROW: QuoteExportRow = {
  zipCode: '44287',
  city: 'west Salem',
  state: 'OH',
  oakType: 'NON-OAK',
  por: 'COLUMBUS',
  pol: 'NOR/NY',
  pod: 'SHA',
  oceanFreight: '700/750/775',
  ssl: 'YML/EMC/COSCO',
  truckingFee: '1320/1400',
  fmNonOak: 960,
  fmOak: 1390,
  docUsd: '300/BILL',
  remark: 'NS LIFT: 150\nChassis: 45\nWaiting: 100\nREDELIVERY FEE: AT COST',
};

export function quoteExportHeaders(): string[] {
  return QUOTE_EXPORT_COLUMNS.map((col) => col.header);
}

export function quoteExportRowToCells(row: QuoteExportRow): string[] {
  return QUOTE_EXPORT_COLUMNS.map((col) => {
    const value = row[col.field];
    if (value === undefined || value === null || value === '') {
      return '';
    }
    return String(value);
  });
}

function readSnapshot(extra?: QuoteLineExtraJson): Record<string, unknown> {
  return (extra?.costSnapshot ?? {}) as Record<string, unknown>;
}

function pickString(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  return undefined;
}

function pickNumber(...values: unknown[]): number | undefined {
  for (const value of values) {
    const num = Number(value);
    if (Number.isFinite(num) && num !== 0) {
      return num;
    }
  }
  return undefined;
}

function mergeSlashUnique(values: string[]): string | undefined {
  const parts = [
    ...new Set(
      values
        .flatMap((item) => item.split('/'))
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  ];
  return parts.length > 0 ? parts.join('/') : undefined;
}

function formatOceanFreight(values: number[]): string | undefined {
  if (values.length === 0) {
    return undefined;
  }
  return values.join('/');
}

function formatOakType(value?: null | string): string | undefined {
  if (!value?.trim()) {
    return undefined;
  }
  const normalized = value.trim().toUpperCase().replaceAll(/_/g, '-');
  if (normalized === 'NON-OAK' || normalized === 'OAK') {
    return normalized;
  }
  return value.trim();
}

function formatFeeLine(label: string, value?: null | number | string) {
  if (value === null || value === undefined || value === '') {
    return undefined;
  }
  return `${label}: ${value}`;
}

/**
 * REMARK：卡车额外费用 + 卡车额外费用备注 + 报价单备注；换行区分。
 */
export function buildQuoteExportRemark(input: {
  chassis?: null | number;
  nsLift?: null | number;
  redeliveryFee?: null | number | string;
  sheetRemark?: null | string;
  truckRemark?: null | string;
  waiting?: null | number;
}): string {
  const lines: string[] = [];
  const nsLift = formatFeeLine('NS LIFT', input.nsLift);
  if (nsLift) {
    lines.push(nsLift);
  }
  const chassis = formatFeeLine('Chassis', input.chassis);
  if (chassis) {
    lines.push(chassis);
  }
  const waiting = formatFeeLine('Waiting', input.waiting);
  if (waiting) {
    lines.push(waiting);
  }
  if (
    input.redeliveryFee !== null &&
    input.redeliveryFee !== undefined &&
    input.redeliveryFee !== ''
  ) {
    lines.push(`REDELIVERY FEE: ${input.redeliveryFee}`);
  } else if (lines.length > 0 || input.truckRemark?.trim()) {
    lines.push(`REDELIVERY FEE: ${FIXED_TRUCK_REDELIVERY_RATE}`);
  }
  if (input.truckRemark?.trim()) {
    lines.push(input.truckRemark.trim());
  }
  if (input.sheetRemark?.trim()) {
    lines.push(input.sheetRemark.trim());
  }
  return lines.join('\n');
}

/**
 * 从报价明细快照组装导出行（不查成本库）。
 * 规则：以卡车行为主行；海运行/手动行向同行或首行合并字段。
 */
export function buildQuoteExportRows(
  detail: Pick<QuoteApi.QuoteDetail, 'lines' | 'oakType' | 'remark' | 'sheet'>,
): QuoteExportRow[] {
  const sheet = detail.sheet;
  if (sheet) {
    const truckingParts = [sheet.truckingFee, sheet.truckingFee2]
      .filter((v) => v !== null && v !== undefined && !Number.isNaN(Number(v)))
      .map(String);
    return [
      {
        zipCode: sheet.zipCode,
        city: sheet.city,
        state: sheet.state,
        oakType: formatOakType(detail.oakType),
        por: sheet.por,
        pol: sheet.pol,
        pod: sheet.pod,
        oceanFreight: sheet.oceanFreight?.trim() || undefined,
        ssl: sheet.ssl,
        truckingFee:
          truckingParts.length > 0 ? truckingParts.join('/') : undefined,
        fmNonOak: sheet.fmNonOak,
        fmOak: sheet.fmOak,
        docUsd: sheet.docUsd,
        remark: buildQuoteExportRemark({
          chassis: sheet.chassis,
          nsLift: sheet.nsLift,
          redeliveryFee: sheet.redeliveryFee,
          sheetRemark: sheet.sheetRemark || detail.remark,
          truckRemark: sheet.truckRemark,
          waiting: sheet.waiting,
        }),
      },
    ];
  }

  const lines = detail.lines ?? [];
  const roadLines = lines.filter((line) => line.costMode === 'ROAD_REF');
  const seaLines = lines.filter((line) => line.costMode === 'SEA_REF');
  const manualLines = lines.filter((line) => line.costMode === 'MANUAL');

  const seaFreights = seaLines
    .map((line) => Number(line.unitPrice))
    .filter((n) => Number.isFinite(n) && n > 0);
  const sharedOcean = formatOceanFreight(seaFreights);
  const sharedSsl = mergeSlashUnique(
    seaLines
      .map((line) => pickString(readSnapshot(line.extraJson).carrier))
      .filter((item): item is string => !!item),
  );
  const sharedPod = pickString(
    ...seaLines.map((line) => readSnapshot(line.extraJson).destination),
  );

  const sharedDoc = pickString(
    ...manualLines
      .filter((line) => /doc|单证/i.test(line.itemName))
      .map((line) =>
        line.unit ? `${line.unitPrice}/${line.unit}` : String(line.unitPrice),
      ),
  );

  const headerRemark = detail.remark?.trim();

  if (
    roadLines.length === 0 &&
    seaLines.length === 0 &&
    manualLines.length > 0
  ) {
    return [
      {
        docUsd: sharedDoc,
        oakType: formatOakType(detail.oakType),
        oceanFreight: sharedOcean,
        pod: sharedPod,
        remark: headerRemark,
        ssl: sharedSsl,
      },
    ];
  }

  const baseRows: QuoteExportRow[] =
    roadLines.length > 0
      ? roadLines.map((line) => roadLineToExportRow(line, detail.oakType))
      : [{}];

  return baseRows.map((row) => ({
    ...row,
    docUsd: row.docUsd ?? sharedDoc,
    oakType: row.oakType ?? formatOakType(detail.oakType),
    oceanFreight: row.oceanFreight ?? sharedOcean,
    pod: row.pod ?? sharedPod,
    remark: row.remark || headerRemark || undefined,
    ssl: row.ssl ?? sharedSsl,
  }));
}

function roadLineToExportRow(
  line: QuoteApi.QuoteLine,
  oakType?: string,
): QuoteExportRow {
  const snap = readSnapshot(line.extraJson);
  const extra = line.extraJson as QuoteLineExtraJson | undefined;
  const truckingParts = [
    pickNumber(snap.allInNoFm, snap.allInNonOak, snap.truckingFee),
    pickNumber(snap.allInFmOneWay, snap.allInOak, snap.truckingFee2),
  ].filter((v): v is number => v !== undefined);

  return {
    city: pickString(snap.city, snap.por),
    fmNonOak: pickNumber(snap.fmNonOak, snap.baseFreight),
    fmOak: pickNumber(snap.fmOak),
    oakType: formatOakType(oakType),
    pol: pickString(snap.pol),
    por: pickString(snap.por, snap.city),
    remark: buildQuoteExportRemark({
      chassis: pickNumber(snap.chassis),
      nsLift: pickNumber(snap.nsLift),
      redeliveryFee:
        pickNumber(snap.redeliveryFee) ?? pickString(snap.redelivery),
      sheetRemark: pickString(snap.sheetRemark, snap.remark),
      truckRemark: pickString(snap.truckRemark),
      waiting: pickNumber(snap.waiting, snap.waitingFee),
    }),
    state: pickString(snap.state),
    truckingFee: truckingParts.length > 0 ? truckingParts.join('/') : undefined,
    zipCode: pickString(snap.zipCode, extra?.costSnapshot?.zipCode),
  };
}

/** 编辑页 LineDraft 版本（保存前预览） */
export function buildExportRowsFromDrafts(
  lines: LineDraft[],
  headerRemark?: string,
  oakType?: string,
): QuoteExportRow[] {
  const serialized: QuoteApi.QuoteLine[] = lines
    .filter((line) => line.itemName.trim() || isCostLine(line))
    .map((line, index) => ({
      amount: 0,
      costMode: line.costMode,
      costRefId: line.costRefId,
      extraJson: line.extraJson,
      itemName: line.itemName,
      quantity: line.quantity,
      sort: index,
      spec: line.spec,
      unit: line.unit,
      unitPrice: line.unitPrice,
    }));

  return buildQuoteExportRows({
    lines: serialized,
    oakType,
    remark: headerRemark,
  });
}
