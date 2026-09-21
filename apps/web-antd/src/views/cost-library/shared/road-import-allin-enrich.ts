import type { SupplierAllInFormulas } from '../road/formula-eval';

import type { SupplierApi } from '#/api/supplier';

import { getSupplierList } from '#/api/supplier';

import {
  feeValuesFromRecord,
  formulaForAllInField,
  hasSupplierAllInFormula,
  resolveAllInFromFormulas,
  ROAD_EXTRA_CHASSIS_FIELD,
  ROAD_YARD_STORAGE_FIELD,
} from '../road/formula-eval';

export type RoadAllInEnrichIssue = {
  message: string;
  rowIndex: number;
};

export type RoadAllInEnrichResult = {
  issues: RoadAllInEnrichIssue[];
  recalculated: number;
  rows: Record<string, string>[];
  supplierNormalized: number;
};

type RoadImportColumnIndexes = {
  allInFmOneWayIndex: number;
  allInFmRoundIndex: number;
  allInNoFmIndex: number;
  baseFreightIndex: number;
  chassisIndex: number;
  extraChassisIndex: number;
  fscIndex: number;
  nsLiftIndex: number;
  otherFeeIndex: number;
  prepullIndex: number;
  redeliveryIndex: number;
  splitIndex: number;
  stopOffIndex: number;
  supplierIndex: number;
  triTandemAxleIndex: number;
  waitingFeeIndex: number;
  yardStorageIndex: number;
};

function normalizeHeader(title: string) {
  return title.trim().toUpperCase().replaceAll('*', '').replaceAll(/\s+/g, ' ');
}

function findColumnIndex(
  headers: string[],
  matchers: Array<(normalized: string) => boolean>,
) {
  for (const [index, title] of headers.entries()) {
    const normalized = normalizeHeader(title);
    if (matchers.some((match) => match(normalized))) {
      return index;
    }
  }
  return -1;
}

function resolveRoadImportColumns(headers: string[]): RoadImportColumnIndexes {
  return {
    supplierIndex: findColumnIndex(headers, [
      (h) => h === 'SUPPLIER',
      (h) => h.includes('卡车供应商'),
      (h) => h.includes('供应商') && h.includes('卡车'),
    ]),
    baseFreightIndex: findColumnIndex(headers, [
      (h) => h === 'BASE' || h === 'BASE FREIGHT',
      (h) => h.includes('基础'),
    ]),
    fscIndex: findColumnIndex(headers, [
      (h) => h === 'FSC' || h.startsWith('FSC '),
      (h) => h.includes('燃油'),
    ]),
    chassisIndex: findColumnIndex(headers, [
      (h) => h === 'CHASSIS',
      (h) => h.includes('车架'),
    ]),
    triTandemAxleIndex: findColumnIndex(headers, [
      (h) => h === 'OW',
      (h) => h.includes('TRI TANDEM AXLE'),
      (h) => h.includes('TRI/TANDEM AXLE'),
      (h) => h.includes('OW/TRI'),
      (h) => h.includes('超重'),
    ]),
    splitIndex: findColumnIndex(headers, [
      (h) => h === 'SPLIT',
      (h) => h.includes('分离'),
    ]),
    stopOffIndex: findColumnIndex(headers, [
      (h) => h.startsWith('STOP OFF'),
      (h) => h.includes('停留'),
    ]),
    allInNoFmIndex: findColumnIndex(headers, [
      (h) => h === 'ALL IN' || h === 'ALL IN - NO FM',
      (h) => h.includes('总价') && h.includes('非熏蒸'),
      (h) => h.includes('非熏蒸打包价'),
    ]),
    allInFmOneWayIndex: findColumnIndex(headers, [
      (h) => h === 'ALL IN FM NON OAK' || h === 'ALL IN - FM ONE WAY',
      (h) => h === 'ALL IN - FM (NON OAK)',
      (h) => h.includes('总价') && h.includes('熏非橡'),
      (h) => h.includes('熏蒸打包价') && h.includes('非橡'),
    ]),
    allInFmRoundIndex: findColumnIndex(headers, [
      (h) => h === 'ALL IN FM OAK' || h === 'ALL IN - FM ROUND',
      (h) => h === 'ALL IN - FM (OAK)',
      (h) => h.includes('总价') && h.includes('熏橡'),
    ]),
    waitingFeeIndex: findColumnIndex(headers, [
      (h) => h === 'WAITING' || h === 'WAITING FEE',
      (h) => h.includes('待时费'),
    ]),
    redeliveryIndex: findColumnIndex(headers, [
      (h) => h === 'REDELIVERY',
      (h) => h.includes('后段运费'),
    ]),
    prepullIndex: findColumnIndex(headers, [
      (h) => h === 'PREPULL',
      (h) => h.includes('预提费'),
    ]),
    nsLiftIndex: findColumnIndex(headers, [
      (h) => h === 'LIFT' || h === 'NS LIFT' || h === 'TO LIFT',
      (h) => h.includes('上下车费'),
    ]),
    otherFeeIndex: findColumnIndex(headers, [
      (h) => h === 'OTHERS' || h === 'OTHER FEE',
      (h) => h.includes('其他费'),
    ]),
    yardStorageIndex: findColumnIndex(headers, [
      (h) => h === 'YARD STORAGE',
      (h) => h.includes('堆存费'),
    ]),
    extraChassisIndex: findColumnIndex(headers, [
      (h) => h === 'EXTRA CHASSIS',
      (h) => h.includes('额外车架费'),
    ]),
  };
}

function parsePreviewNumber(raw: string): number | undefined {
  const text = raw.trim().replaceAll('%', '');
  if (!text) {
    return undefined;
  }
  const n = Number(text);
  return Number.isFinite(n) ? n : undefined;
}

function formatPreviewAmount(value: null | number | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return '';
  }
  return String(Math.round(value * 100) / 100);
}

function readCellNumber(row: Record<string, string>, index: number) {
  if (index < 0) {
    return undefined;
  }
  return parsePreviewNumber(String(row[`c${index}`] ?? ''));
}

function buildRecordFromPreviewRow(
  row: Record<string, string>,
  columns: RoadImportColumnIndexes,
): Record<string, unknown> {
  const extraFields: Record<string, unknown> = {};
  const yardStorage = readCellNumber(row, columns.yardStorageIndex);
  if (yardStorage !== undefined) {
    extraFields[ROAD_YARD_STORAGE_FIELD] = yardStorage;
  }
  const extraChassis = readCellNumber(row, columns.extraChassisIndex);
  if (extraChassis !== undefined) {
    extraFields[ROAD_EXTRA_CHASSIS_FIELD] = extraChassis;
  }

  const record: Record<string, unknown> = {
    baseFreight: readCellNumber(row, columns.baseFreightIndex),
    chassis: readCellNumber(row, columns.chassisIndex),
    extraFields,
    fsc: readCellNumber(row, columns.fscIndex),
    nsLift: readCellNumber(row, columns.nsLiftIndex),
    otherFee: readCellNumber(row, columns.otherFeeIndex),
    prepull: readCellNumber(row, columns.prepullIndex),
    redelivery: readCellNumber(row, columns.redeliveryIndex),
    split: readCellNumber(row, columns.splitIndex),
    stopOff: readCellNumber(row, columns.stopOffIndex),
    triTandemAxle: readCellNumber(row, columns.triTandemAxleIndex),
    waitingFee: readCellNumber(row, columns.waitingFeeIndex),
  };

  return record;
}

function toFormulas(supplier: SupplierApi.Supplier): SupplierAllInFormulas {
  return {
    fumigationNonOakPackageFormula: supplier.fumigationNonOakPackageFormula,
    fumigationOakPackageFormula: supplier.fumigationOakPackageFormula,
    nonFumigationPackageFormula: supplier.nonFumigationPackageFormula,
  };
}

function resolveSupplier(
  raw: string,
  byName: Map<string, SupplierApi.Supplier>,
  byShortName: Map<string, SupplierApi.Supplier>,
): SupplierApi.Supplier | undefined {
  const key = raw.trim();
  if (!key) {
    return undefined;
  }
  return byName.get(key) ?? byShortName.get(key);
}

async function loadTruckSuppliers() {
  const result = await getSupplierList({
    category: 'TRUCK',
    page: 1,
    pageSize: 500,
    status: 1,
  });
  const byName = new Map<string, SupplierApi.Supplier>();
  const byShortName = new Map<string, SupplierApi.Supplier>();
  for (const item of result.items) {
    byName.set(item.name.trim(), item);
    if (item.shortName?.trim()) {
      byShortName.set(item.shortName.trim(), item);
    }
  }
  return { byName, byShortName };
}

/** 预览表：匹配供应商；有公式时按费用项重算 ALL IN 列（与导入落库一致）。 */
export async function enrichRoadPreviewAllIn(
  headers: string[],
  rows: Record<string, string>[],
): Promise<RoadAllInEnrichResult> {
  if (rows.length === 0) {
    return {
      issues: [],
      recalculated: 0,
      rows,
      supplierNormalized: 0,
    };
  }

  const columns = resolveRoadImportColumns(headers);
  if (columns.supplierIndex < 0) {
    return {
      issues: [],
      recalculated: 0,
      rows,
      supplierNormalized: 0,
    };
  }

  const { byName, byShortName } = await loadTruckSuppliers();
  const nextRows = rows.map((row) => ({ ...row }));
  let recalculated = 0;
  let supplierNormalized = 0;
  const issues: RoadAllInEnrichIssue[] = [];

  nextRows.forEach((row, rowIndex) => {
    const supplierRaw = String(row[`c${columns.supplierIndex}`] ?? '').trim();
    if (!supplierRaw) {
      return;
    }

    const supplier = resolveSupplier(supplierRaw, byName, byShortName);
    if (!supplier) {
      return;
    }

    const fullName = supplier.name.trim();
    if (fullName !== supplierRaw) {
      row[`c${columns.supplierIndex}`] = fullName;
      supplierNormalized += 1;
    }

    const formulas = toFormulas(supplier);
    if (!hasSupplierAllInFormula(formulas)) {
      return;
    }

    const record = buildRecordFromPreviewRow(row, columns);
    try {
      const computed = resolveAllInFromFormulas(
        formulas,
        feeValuesFromRecord(record),
      );
      let changed = false;

      if (
        formulaForAllInField(formulas, 'allInNoFm') &&
        columns.allInNoFmIndex >= 0
      ) {
        const next = formatPreviewAmount(computed.allInNoFm);
        if (row[`c${columns.allInNoFmIndex}`] !== next) {
          row[`c${columns.allInNoFmIndex}`] = next;
          changed = true;
        }
      }
      if (
        formulaForAllInField(formulas, 'allInFmOneWay') &&
        columns.allInFmOneWayIndex >= 0
      ) {
        const next = formatPreviewAmount(computed.allInFmOneWay);
        if (row[`c${columns.allInFmOneWayIndex}`] !== next) {
          row[`c${columns.allInFmOneWayIndex}`] = next;
          changed = true;
        }
      }
      if (
        formulaForAllInField(formulas, 'allInFmRound') &&
        columns.allInFmRoundIndex >= 0
      ) {
        const next = formatPreviewAmount(computed.allInFmRound);
        if (row[`c${columns.allInFmRoundIndex}`] !== next) {
          row[`c${columns.allInFmRoundIndex}`] = next;
          changed = true;
        }
      }

      if (changed) {
        recalculated += 1;
      }
    } catch (error) {
      issues.push({
        rowIndex,
        message:
          error instanceof Error
            ? error.message
            : String(error ?? 'formula error'),
      });
    }
  });

  return {
    issues,
    recalculated,
    rows: nextRows,
    supplierNormalized,
  };
}
