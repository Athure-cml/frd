import type { SupplierAllInFormulas } from './formula-eval';

import type { RoadCostRecord, RoadCostSave } from '#/api/cost';
import type { SupplierApi } from '#/api/supplier';

import { ROAD_REMARK_FIELD } from '../shared/field-catalog/road';
import {
  applyAllInFormulasToRoadRecord,
  hasSupplierAllInFormula,
} from './formula-eval';

const ROAD_EXTRA_FIELD_KEYS = [
  'cf_road_yard_storage',
  'cf_road_extra_chassis',
  ROAD_REMARK_FIELD,
] as const;

const NUMERIC_OVERRIDE_FIELDS = [
  'baseFreight',
  'fsc',
  'chassis',
  'triTandemAxle',
  'split',
  'stopOff',
  'waitingFee',
  'redelivery',
  'prepull',
  'nsLift',
  'otherFee',
] as const;

function hasMeaningfulValue(value: unknown) {
  if (value === null || value === undefined || value === '') {
    return false;
  }
  if (typeof value === 'string') {
    return value.trim().length > 0;
  }
  return true;
}

function optionalNumber(value: unknown): number | undefined {
  if (!hasMeaningfulValue(value)) {
    return undefined;
  }
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function optionalText(value: unknown): string | undefined {
  if (!hasMeaningfulValue(value)) {
    return undefined;
  }
  return String(value).trim();
}

function pickNumericOverride(
  source: RoadCostRecord,
  overrides: Record<string, unknown>,
  field: (typeof NUMERIC_OVERRIDE_FIELDS)[number],
) {
  const next = optionalNumber(overrides[field]);
  return next === undefined ? source[field] : next;
}

function readSourceExtra(
  source: RoadCostRecord,
  key: (typeof ROAD_EXTRA_FIELD_KEYS)[number],
) {
  const nested = source.extraFields?.[key];
  if (nested === null || nested === undefined || nested === '') {
    return undefined;
  }
  if (key === ROAD_REMARK_FIELD) {
    return optionalText(nested);
  }
  return optionalNumber(nested);
}

function buildExtraFields(
  source: RoadCostRecord,
  overrides: Record<string, unknown>,
  effectiveDate: string,
) {
  const extra: Record<string, unknown> = {
    ...source.extraFields,
  };
  delete extra.cf_road_renewed_from;
  delete extra.cf_road_renewed_to;
  extra.cf_road_eff = effectiveDate;

  for (const key of ROAD_EXTRA_FIELD_KEYS) {
    if (key === ROAD_REMARK_FIELD) {
      const text = optionalText(overrides[key]);
      if (text === undefined) {
        const fromSource = readSourceExtra(source, key);
        if (fromSource !== undefined) {
          extra[key] = fromSource;
        }
      } else {
        extra[key] = text;
      }
      continue;
    }
    const num = optionalNumber(overrides[key]);
    if (num === undefined) {
      const fromSource = readSourceExtra(source, key);
      if (fromSource !== undefined) {
        extra[key] = fromSource;
      }
    } else {
      extra[key] = num;
    }
  }

  return extra;
}

export function toSupplierFormulaLookup(items: SupplierApi.Supplier[]) {
  const byName = new Map<string, SupplierAllInFormulas>();
  const byShortName = new Map<string, SupplierAllInFormulas>();
  for (const item of items) {
    const formulas: SupplierAllInFormulas = {
      fumigationNonOakPackageFormula: item.fumigationNonOakPackageFormula,
      fumigationOakPackageFormula: item.fumigationOakPackageFormula,
      nonFumigationPackageFormula: item.nonFumigationPackageFormula,
    };
    byName.set(item.name.trim(), formulas);
    if (item.shortName?.trim()) {
      byShortName.set(item.shortName.trim(), formulas);
    }
  }
  return { byName, byShortName };
}

function resolveSupplierFormulas(
  supplierName: string | undefined,
  lookup: ReturnType<typeof toSupplierFormulaLookup>,
): SupplierAllInFormulas | undefined {
  if (!supplierName?.trim()) {
    return undefined;
  }
  const key = supplierName.trim();
  return lookup.byName.get(key) ?? lookup.byShortName.get(key);
}

export interface RoadRenewPreviewJob {
  payload: RoadCostSave;
  sourceId: number;
}

function roadSaveToPreviewRecord(
  source: RoadCostRecord,
  payload: RoadCostSave,
  lookup: ReturnType<typeof toSupplierFormulaLookup>,
): RoadCostRecord {
  const record: RoadCostRecord = {
    ...source,
    allInFmOneWay: payload.allInFmOneWay ?? source.allInFmOneWay,
    allInFmRound: payload.allInFmRound ?? source.allInFmRound,
    allInNoFm: payload.allInNoFm ?? source.allInNoFm,
    baseFreight: payload.baseFreight ?? source.baseFreight,
    chassis: payload.chassis ?? source.chassis,
    city: payload.city ?? source.city,
    extraFields: payload.extraFields ?? source.extraFields,
    fsc: payload.fsc ?? source.fsc,
    logYardNameAddress: payload.logYardNameAddress ?? source.logYardNameAddress,
    nsLift: payload.nsLift ?? source.nsLift,
    otherFee: payload.otherFee ?? source.otherFee,
    pol: payload.pol ?? source.pol,
    por: payload.por ?? source.por,
    prepull: payload.prepull ?? source.prepull,
    redelivery: payload.redelivery ?? source.redelivery,
    remark: payload.remark ?? source.remark,
    split: payload.split ?? source.split,
    state: payload.state ?? source.state,
    status: payload.status ?? source.status,
    stopOff: payload.stopOff ?? source.stopOff,
    supplier: payload.supplier ?? source.supplier,
    triTandemAxle: payload.triTandemAxle ?? source.triTandemAxle,
    validDate: payload.validDate ?? source.validDate,
    waitingFee: payload.waitingFee ?? source.waitingFee,
    zipCode: payload.zipCode ?? source.zipCode,
  };
  const formulas = resolveSupplierFormulas(source.supplier, lookup);
  return applyAllInFormulasToRoadRecord(record, formulas);
}

/** 批量续期预览：生成表格展示数据与待写入任务 */
export function buildRoadRenewPreviewPlan(
  sources: RoadCostRecord[],
  overrides: Record<string, unknown>,
  lookup: ReturnType<typeof toSupplierFormulaLookup>,
) {
  const items: RoadCostRecord[] = [];
  const renewJobs: RoadRenewPreviewJob[] = [];
  for (const source of sources) {
    if (source.id === undefined || source.id === null) {
      continue;
    }
    const payload = buildRoadRenewSavePayload(source, overrides, lookup);
    renewJobs.push({ payload, sourceId: source.id });
    items.push(roadSaveToPreviewRecord(source, payload, lookup));
  }
  return { items, renewJobs };
}

/** 批量续期：源行 + 弹窗覆盖项 → renew 请求体 */
export function buildRoadRenewSavePayload(
  source: RoadCostRecord,
  overrides: Record<string, unknown>,
  lookup: ReturnType<typeof toSupplierFormulaLookup>,
): RoadCostSave {
  const effectiveDate = optionalText(overrides.cf_road_eff);
  if (!effectiveDate) {
    throw new Error('missing effective date');
  }

  const formulas = resolveSupplierFormulas(source.supplier, lookup);
  const useFormulaAllIn = hasSupplierAllInFormula(formulas);

  return {
    allInFmOneWay: useFormulaAllIn ? undefined : source.allInFmOneWay,
    allInFmRound: useFormulaAllIn ? undefined : source.allInFmRound,
    allInNoFm: useFormulaAllIn ? undefined : source.allInNoFm,
    baseFreight: pickNumericOverride(source, overrides, 'baseFreight'),
    chassis: pickNumericOverride(source, overrides, 'chassis'),
    city: source.city,
    extraFields: buildExtraFields(source, overrides, effectiveDate),
    fsc: pickNumericOverride(source, overrides, 'fsc'),
    logYardNameAddress: hasMeaningfulValue(overrides.logYardNameAddress)
      ? optionalText(overrides.logYardNameAddress)
      : source.logYardNameAddress,
    nsLift: pickNumericOverride(source, overrides, 'nsLift'),
    otherFee: pickNumericOverride(source, overrides, 'otherFee'),
    pol: hasMeaningfulValue(overrides.pol)
      ? String(overrides.pol).trim()
      : source.pol,
    por: source.por,
    prepull: pickNumericOverride(source, overrides, 'prepull'),
    redelivery: pickNumericOverride(source, overrides, 'redelivery'),
    remark: hasMeaningfulValue(overrides.remark)
      ? optionalText(overrides.remark)
      : source.remark,
    split: pickNumericOverride(source, overrides, 'split'),
    state: source.state,
    status: 'active',
    stopOff: pickNumericOverride(source, overrides, 'stopOff'),
    supplier: source.supplier,
    triTandemAxle: pickNumericOverride(source, overrides, 'triTandemAxle'),
    validDate: optionalText(overrides.validDate),
    waitingFee: pickNumericOverride(source, overrides, 'waitingFee'),
    zipCode: source.zipCode,
  };
}
