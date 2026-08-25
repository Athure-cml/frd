import type { FieldCatalogEntry } from './field-catalog';

import type { CostMode } from '#/api/cost';

import { coerceAmountValue } from './fee-unit-pairs';
import { formatDateMd } from './formatters';
import { isCustomFieldKey } from './template-field-model';

function isAmountLikeFormat(format?: FieldCatalogEntry['format']) {
  return format === 'amount' || format === 'percent' || format === 'price';
}

function isDateLikeField(
  mode: CostMode,
  field: string,
  entry: FieldCatalogEntry,
  title: string,
) {
  if (entry.format === 'dateMd' || entry.format === 'dateMmDd') {
    return true;
  }
  if (field.endsWith('ValidDate') || field.endsWith('Validity')) {
    return true;
  }
  if (field === 'validDate') {
    return true;
  }
  if (title === '生效期' || title === '有效期' || title === 'VALID TIME') {
    return true;
  }
  if (title === 'EFFECTIVE TIME') {
    return true;
  }
  if (field.startsWith('cf_') && /(_eff|Eff)$/.test(field)) {
    return true;
  }
  if (mode === 'fumigation' && field.startsWith('cf_fum_')) {
    return true;
  }
  return false;
}

/** 表头排序取值：金额/数字按数值，日期按 yyyy/MM/dd，文本按小写字符串 */
export function buildColumnSortBy(
  entry: FieldCatalogEntry,
  mode: CostMode,
  meta: { field: string; title: string },
) {
  const fieldKey = meta.field;
  const isCustom = isCustomFieldKey(fieldKey);
  const dateLike = isDateLikeField(mode, fieldKey, entry, meta.title);

  return ({
    row,
  }: {
    row: Record<string, unknown> & { extraFields?: Record<string, unknown> };
  }) => {
    const raw = isCustom ? row.extraFields?.[fieldKey] : row[entry.field];
    if (raw === null || raw === undefined || raw === '') {
      return null;
    }
    if (isAmountLikeFormat(entry.format)) {
      return coerceAmountValue(raw);
    }
    if (dateLike) {
      const text =
        typeof raw === 'string' || typeof raw === 'number' ? raw : String(raw);
      return formatDateMd(text);
    }
    if (typeof raw === 'number' && Number.isFinite(raw)) {
      return raw;
    }
    const asNum = coerceAmountValue(raw);
    if (asNum !== null) {
      return asNum;
    }
    return String(raw).trim().toLowerCase();
  };
}
