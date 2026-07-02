import type { QuoteApi } from '#/api/quote';

import {
  isCostLine,
  type LineDraft,
  type QuoteLineExtraJson,
} from './cost-mapping';

/** 客户交付 Excel 一行（15 列，顺序与 QUOTE-EXPORT.md 一致） */
export interface QuoteExportRow {
  cargoMaxWeight?: string;
  city?: string;
  docUsd?: string;
  fmNonOak?: number | string;
  fmOak?: number | string;
  oceanFreightUsd?: string;
  pod?: string;
  pol?: string;
  por?: string;
  remark?: string;
  ssl?: string;
  state?: string;
  truckingNonOakUsd?: number;
  truckingOakUsd?: number;
  zipCode?: string;
}

export interface QuoteExportColumn {
  field: keyof QuoteExportRow;
  /** Excel 第 1 行表头（与业务模板一致） */
  header: string;
  width?: number;
}

/** 固定列序 — 修改须同步 QUOTE-EXPORT.md */
export const QUOTE_EXPORT_COLUMNS: QuoteExportColumn[] = [
  { field: 'zipCode', header: 'Zip code', width: 10 },
  { field: 'city', header: 'City', width: 14 },
  { field: 'state', header: 'State', width: 8 },
  { field: 'por', header: 'POR', width: 12 },
  { field: 'pol', header: 'POL', width: 12 },
  { field: 'pod', header: 'POD', width: 10 },
  { field: 'oceanFreightUsd', header: 'O/F (USD)', width: 14 },
  { field: 'ssl', header: 'SSL', width: 18 },
  { field: 'truckingNonOakUsd', header: 'TRUCKING NON OAK (USD)', width: 22 },
  { field: 'truckingOakUsd', header: 'TRUCKING OAK (USD)', width: 20 },
  { field: 'fmNonOak', header: 'FM NON OAK', width: 12 },
  { field: 'fmOak', header: 'FM OAK', width: 12 },
  { field: 'docUsd', header: 'DOC (USD)', width: 12 },
  { field: 'cargoMaxWeight', header: 'CARGO Max weight (ton)', width: 22 },
  { field: 'remark', header: 'REMARK', width: 48 },
];

/** 业务提供的样本行，用于导出预览与单测 */
export const QUOTE_EXPORT_SAMPLE_ROW: QuoteExportRow = {
  zipCode: '44287',
  city: 'west Salem',
  state: 'OH',
  por: 'COLUMBUS',
  pol: 'NOR/NY',
  pod: 'SHA',
  oceanFreightUsd: '700/750/775',
  ssl: 'YML/EMC/COSCO',
  truckingNonOakUsd: 1320,
  truckingOakUsd: 1400,
  fmNonOak: 960,
  fmOak: 1390,
  docUsd: '300/BILL',
  cargoMaxWeight: 'OW MAX52000LBS',
  remark:
    'OF SUBJECT TO GRI /BUC TRUCKING INCLUDE 4DAYS CHASSIS FOR NON OAK& 5DAYS CHASSIS FOR OAK, EXTRA CHASSIS 40/day',
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
  if (values.length === 1) {
    return String(values[0]);
  }
  return values.join('/');
}

/**
 * 从报价明细快照组装导出行（不查成本库）。
 * 规则：以卡车行为主行；海运行/手动行向同行或首行合并字段。
 */
export function buildQuoteExportRows(
  detail: Pick<QuoteApi.QuoteDetail, 'lines' | 'remark'>,
): QuoteExportRow[] {
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
  const manualRemarks = manualLines
    .map((line) => line.itemName?.trim())
    .filter(Boolean);

  if (
    roadLines.length === 0 &&
    seaLines.length === 0 &&
    manualLines.length > 0
  ) {
    return [
      {
        docUsd: sharedDoc,
        oceanFreightUsd: sharedOcean,
        pod: sharedPod,
        remark: [headerRemark, ...manualRemarks].filter(Boolean).join('; '),
        ssl: sharedSsl,
      },
    ];
  }

  const baseRows: QuoteExportRow[] =
    roadLines.length > 0
      ? roadLines.map((line) => roadLineToExportRow(line))
      : [{}];

  return baseRows.map((row, index) => ({
    ...row,
    cargoMaxWeight: row.cargoMaxWeight ?? pickString(manualLines[0]?.spec),
    docUsd: row.docUsd ?? sharedDoc,
    oceanFreightUsd: row.oceanFreightUsd ?? sharedOcean,
    pod: row.pod ?? sharedPod,
    remark:
      [headerRemark, row.remark, index === 0 ? manualRemarks.join('; ') : '']
        .filter(Boolean)
        .join('; ') || undefined,
    ssl: row.ssl ?? sharedSsl,
  }));
}

function roadLineToExportRow(line: QuoteApi.QuoteLine): QuoteExportRow {
  const snap = readSnapshot(line.extraJson);
  const extra = line.extraJson as QuoteLineExtraJson | undefined;

  return {
    city: pickString(snap.city),
    fmNonOak: pickNumber(snap.fmNonOak, snap.baseFreight),
    fmOak: pickNumber(snap.fmOak),
    pol: pickString(snap.pol),
    por: pickString(snap.por),
    remark: pickString(snap.remark),
    state: pickString(snap.state),
    truckingNonOakUsd: pickNumber(snap.allInNonOak),
    truckingOakUsd: pickNumber(snap.allInOak),
    zipCode: pickString(snap.zipCode, extra?.costSnapshot?.zipCode),
  };
}

/** 编辑页 LineDraft 版本（保存前预览） */
export function buildExportRowsFromDrafts(
  lines: LineDraft[],
  headerRemark?: string,
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

  return buildQuoteExportRows({ lines: serialized, remark: headerRemark });
}
