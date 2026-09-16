import type { SupplierAllInFormulas } from './formula-eval';

import type { RoadCostRecord } from '#/api/cost';
import type { SupplierApi } from '#/api/supplier';

import { getSupplierList } from '#/api/supplier';

import {
  applyAllInFormulasToRoadRecord,
  hasSupplierAllInFormula,
} from './formula-eval';

function toFormulas(supplier: SupplierApi.Supplier): SupplierAllInFormulas {
  return {
    fumigationNonOakPackageFormula: supplier.fumigationNonOakPackageFormula,
    fumigationOakPackageFormula: supplier.fumigationOakPackageFormula,
    nonFumigationPackageFormula: supplier.nonFumigationPackageFormula,
  };
}

function resolveSupplierFormulas(
  supplierName: string | undefined,
  byName: Map<string, SupplierAllInFormulas>,
  byShortName: Map<string, SupplierAllInFormulas>,
): SupplierAllInFormulas | undefined {
  if (!supplierName?.trim()) {
    return undefined;
  }
  const key = supplierName.trim();
  return byName.get(key) ?? byShortName.get(key);
}

const ROAD_ALL_IN_INPUT_FIELDS = new Set([
  'baseFreight',
  'cf_road_extra_chassis',
  'cf_road_yard_storage',
  'chassis',
  'fsc',
  'nsLift',
  'otherFee',
  'prepull',
  'redelivery',
  'split',
  'stopOff',
  'triTandemAxle',
  'waitingFee',
]);

function roadOverrideAffectsAllIn(fields: Record<string, unknown>) {
  return Object.keys(fields).some((key) => ROAD_ALL_IN_INPUT_FIELDS.has(key));
}

/** 批量复制预览：有供应商公式时按覆盖后的费用重算 ALL IN，否则保留原值。 */
export async function enrichRoadBatchCopyPreviewItems(
  items: RoadCostRecord[],
  applyOverrides: boolean,
  overrideFields?: Record<string, unknown>,
): Promise<RoadCostRecord[]> {
  if (
    !applyOverrides ||
    items.length === 0 ||
    !overrideFields ||
    !roadOverrideAffectsAllIn(overrideFields)
  ) {
    return items;
  }

  const result = await getSupplierList({
    category: 'TRUCK',
    page: 1,
    pageSize: 500,
    status: 1,
  });
  const byName = new Map<string, SupplierAllInFormulas>();
  const byShortName = new Map<string, SupplierAllInFormulas>();
  for (const item of result.items) {
    const formulas = toFormulas(item);
    byName.set(item.name.trim(), formulas);
    if (item.shortName?.trim()) {
      byShortName.set(item.shortName.trim(), formulas);
    }
  }

  return items.map((row) => {
    const formulas = resolveSupplierFormulas(row.supplier, byName, byShortName);
    if (!hasSupplierAllInFormula(formulas)) {
      return row;
    }
    return applyAllInFormulasToRoadRecord(row, formulas);
  });
}
