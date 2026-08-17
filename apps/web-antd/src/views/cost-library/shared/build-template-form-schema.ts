import type { VbenFormSchema } from '#/adapter/form';
import type { CostMode, CostTableTemplate } from '#/api/cost';

import { getEnabledUnitOptions } from '#/api/unit';
import { $t } from '#/locales';

import { isRoadFeeUnitField } from './fee-unit-pairs';
import {
  buildLayoutFieldItems,
  isCustomFieldKey,
} from './template-field-model';

const FUMIGATION_OUTDOOR_FIELDS = new Set([
  'cf_fum_outdoor_eff',
  'outdoorNonOak',
  'outdoorOak',
  'outdoorValidity',
]);
const FUMIGATION_INDOOR_FIELDS = new Set([
  'cf_fum_indoor_eff',
  'indoorNonOak',
  'indoorOak',
  'indoorValidity',
]);
const SEA_SURCHARGE_FIELDS = new Set([
  'buc',
  'bucValidDate',
  'ebs',
  'ebsValidDate',
  'gri',
  'griValidDate',
  'others',
  'othersValidDate',
]);

const SEA_EFF_CUSTOM_FIELDS = new Set([
  'cf_fum_indoor_eff',
  'cf_fum_outdoor_eff',
  'cf_road_eff',
  'cf_sea_bunker_eff',
  'cf_sea_freight_eff',
  'cf_sea_others_eff',
  'cf_seaBunkerEff',
  'cf_seaFreightEff',
  'cf_seaOthersEff',
]);

function datePickerProps() {
  return {
    allowClear: true,
    class: 'w-full',
    format: 'YYYY-MM-DD',
    valueFormat: 'YYYY-MM-DD',
  };
}

function isCustomDateField(field: string, dataType?: string, title?: string) {
  return (
    dataType === 'date' ||
    SEA_EFF_CUSTOM_FIELDS.has(field) ||
    title === '生效期' ||
    title === 'EFFECTIVE TIME'
  );
}

export function buildTemplateFormSchema(
  mode: CostMode,
  template: CostTableTemplate | undefined,
  baseSchema: VbenFormSchema[],
): VbenFormSchema[] {
  if (!template) {
    return baseSchema;
  }

  const layoutItems = buildLayoutFieldItems(mode, template.layout).filter(
    (item) => item.visible,
  );
  if (layoutItems.length === 0) {
    return baseSchema;
  }

  const schemaMap = new Map(
    baseSchema.map((item) => [item.fieldName as string, item]),
  );
  const ordered: VbenFormSchema[] = [];
  let outdoorDividerAdded = false;
  let indoorDividerAdded = false;
  let seaSurchargeDividerAdded = false;

  for (const item of layoutItems) {
    if (isCustomFieldKey(item.field)) {
      if (isRoadFeeUnitField(item.field)) {
        ordered.push({
          component: 'ApiSelect',
          componentProps: {
            allowClear: true,
            api: getEnabledUnitOptions,
            class: 'w-full',
            filterOption: true,
            placeholder: 'hours',
            showSearch: true,
          },
          fieldName: `extraFields.${item.field}`,
          label: item.title,
          rules: item.required ? 'required' : undefined,
        });
      } else if (isCustomDateField(item.field, item.dataType, item.title)) {
        ordered.push({
          component: 'DatePicker',
          componentProps: datePickerProps(),
          fieldName: `extraFields.${item.field}`,
          label: item.title,
          rules: item.required ? 'required' : undefined,
        });
      } else {
        ordered.push({
          component: item.dataType === 'number' ? 'InputNumber' : 'Input',
          componentProps:
            item.dataType === 'number'
              ? { class: 'w-full', precision: 2 }
              : undefined,
          fieldName: `extraFields.${item.field}`,
          label: item.title,
          rules: item.required ? 'required' : undefined,
        });
      }
      continue;
    }

    if (mode === 'fumigation') {
      if (!outdoorDividerAdded && FUMIGATION_OUTDOOR_FIELDS.has(item.field)) {
        const divider = schemaMap.get('outdoorDivider');
        if (divider) {
          ordered.push(divider);
        }
        outdoorDividerAdded = true;
      }
      if (!indoorDividerAdded && FUMIGATION_INDOOR_FIELDS.has(item.field)) {
        const divider = schemaMap.get('indoorDivider');
        if (divider) {
          ordered.push(divider);
        }
        indoorDividerAdded = true;
      }
    }

    if (
      mode === 'sea' &&
      !seaSurchargeDividerAdded &&
      SEA_SURCHARGE_FIELDS.has(item.field)
    ) {
      const divider = schemaMap.get('surchargeDivider');
      if (divider) {
        ordered.push(divider);
      }
      seaSurchargeDividerAdded = true;
    }

    const base = schemaMap.get(item.field);
    if (!base) {
      continue;
    }

    // 附加费：OTHERS / ALL IN 强制换行，避免与上一组日期挤在同一行
    const forceNewRow =
      mode === 'sea' && (item.field === 'others' || item.field === 'allIn');

    ordered.push({
      ...base,
      ...(forceNewRow ? { formItemClass: 'col-start-1' } : {}),
      label: item.title,
      rules: item.required
        ? 'required'
        : base.rules === 'required'
          ? 'required'
          : base.rules,
    });
  }

  return ordered.length > 0 ? ordered : baseSchema;
}

export function extractExtraFields(values: Record<string, any>) {
  const extra: Record<string, unknown> = {
    ...values.extraFields,
  };
  const clearedFields = new Set<string>();
  Object.entries(values).forEach(([key, value]) => {
    if (!key.startsWith('extraFields.')) {
      return;
    }
    const field = key.slice('extraFields.'.length);
    if (!field.startsWith('cf_')) {
      return;
    }
    // 显式清空：从表单扁平字段剔除，避免旧值残留
    if (value === undefined || value === null || value === '') {
      clearedFields.add(field);
      return;
    }
    if (
      typeof value === 'string' &&
      (field.includes('_eff') || field.toLowerCase().includes('eff'))
    ) {
      extra[field] = value.trim();
      return;
    }
    extra[field] = value;
  });
  const normalized = Object.fromEntries(
    Object.entries(extra).filter(
      ([key]) => key.startsWith('cf_') && !clearedFields.has(key),
    ),
  );
  // 始终返回对象，便于后端整包覆盖（含清空）
  return normalized;
}

export function mergeRecordWithExtraFields<T extends Record<string, any>>(
  row: T,
): T & { extraFields?: Record<string, unknown> } {
  return {
    ...row,
    extraFields: row.extraFields ?? {},
  };
}

export function templateFormHint() {
  return $t('page.costLibrary.template.formDrivenByTemplate');
}
