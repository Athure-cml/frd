import type { QuoteLibraryMode } from './quote-library-columns';

import type { VbenFormSchema } from '#/adapter/form';
import type { QuoteLibraryEditContext } from '#/api/quote/library';

import { $t } from '#/locales';

const roadT = (key: string) => $t(`page.costLibrary.roadFields.${key}`);
const seaT = (key: string) => $t(`page.costLibrary.seaFields.${key}`);
const fumT = (key: string) => $t(`page.costLibrary.fumigationFields.${key}`);

const ROAD_FEE_FIELDS = [
  'allInNoFm',
  'allInFmOneWay',
  'allInFmRound',
  'nsLift',
  'chassis',
  'waitingFee',
  'redelivery',
] as const;

const SEA_FEE_FIELDS = ['allIn', 'freight'] as const;

const FUMIGATION_FEE_FIELDS = [
  'outdoorNonOak',
  'outdoorOak',
  'indoorNonOak',
  'indoorOak',
] as const;

function fieldLabel(mode: QuoteLibraryMode, field: string) {
  if (mode === 'road') {
    return roadT(field);
  }
  if (mode === 'sea') {
    return seaT(field);
  }
  return fumT(field);
}

function feeFieldsForMode(mode: QuoteLibraryMode) {
  if (mode === 'road') {
    return ROAD_FEE_FIELDS;
  }
  if (mode === 'sea') {
    return SEA_FEE_FIELDS;
  }
  return FUMIGATION_FEE_FIELDS;
}

function amountSchema(
  field: string,
  label: string,
  floor?: number,
): VbenFormSchema {
  return {
    component: 'InputNumber',
    componentProps: {
      class: 'w-full',
      min: floor ?? 0,
      precision: 2,
    },
    fieldName: field,
    help:
      floor === undefined
        ? undefined
        : $t('page.quote.library.feeFloorHint', [floor]),
    label,
  };
}

export function buildQuoteLibraryFeeSchema(
  mode: QuoteLibraryMode,
  context?: null | QuoteLibraryEditContext,
): VbenFormSchema[] {
  const editable = new Set(context?.editableFields ?? feeFieldsForMode(mode));
  const floors = context?.costFloors ?? {};
  const values = context?.values ?? {};

  return feeFieldsForMode(mode)
    .filter((field) => editable.has(field))
    .map((field) => amountSchema(field, fieldLabel(mode, field), floors[field]))
    .map((schema) => ({
      ...schema,
      defaultValue: values[schema.fieldName as string],
    }));
}

export function buildQuoteLibraryBatchFeeSchema(
  mode: QuoteLibraryMode,
): VbenFormSchema[] {
  return feeFieldsForMode(mode).map((field) =>
    amountSchema(field, fieldLabel(mode, field)),
  );
}

export function normalizeQuoteLibraryFeeValues(
  values: Record<string, unknown>,
) {
  const fields: Record<string, number> = {};
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined || value === null || value === '') {
      continue;
    }
    fields[key] = Number(value);
  }
  return fields;
}
