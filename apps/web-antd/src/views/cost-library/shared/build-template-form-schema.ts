import type { VbenFormSchema } from '#/adapter/form';
import type { CostMode, CostTableTemplate } from '#/api/cost';

import { $t } from '#/locales';

import {
  buildLayoutFieldItems,
  isCustomFieldKey,
} from './template-field-model';

const FUMIGATION_NON_OAK_FIELDS = new Set([
  'nonOakIndoor',
  'nonOakOutdoor',
  'nonOakQuoteSummer',
  'nonOakQuoteWinter',
]);
const FUMIGATION_OAK_FIELDS = new Set([
  'oakIndoor',
  'oakOutdoor',
  'oakQuoteSummer',
  'oakQuoteWinter',
]);

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
  let nonOakDividerAdded = false;
  let oakDividerAdded = false;

  for (const item of layoutItems) {
    if (isCustomFieldKey(item.field)) {
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
      continue;
    }

    if (mode === 'fumigation') {
      if (!nonOakDividerAdded && FUMIGATION_NON_OAK_FIELDS.has(item.field)) {
        const divider = schemaMap.get('nonOakDivider');
        if (divider) {
          ordered.push(divider);
        }
        nonOakDividerAdded = true;
      }
      if (!oakDividerAdded && FUMIGATION_OAK_FIELDS.has(item.field)) {
        const divider = schemaMap.get('oakDivider');
        if (divider) {
          ordered.push(divider);
        }
        oakDividerAdded = true;
      }
    }

    const base = schemaMap.get(item.field);
    if (!base) {
      continue;
    }

    ordered.push({
      ...base,
      label: item.title,
      rules: item.required ? 'required' : undefined,
    });
  }

  return ordered.length > 0 ? ordered : baseSchema;
}

export function extractExtraFields(values: Record<string, any>) {
  const extra: Record<string, unknown> = {
    ...values.extraFields,
  };
  Object.entries(values).forEach(([key, value]) => {
    if (!key.startsWith('extraFields.')) {
      return;
    }
    if (value === undefined || value === null || value === '') {
      return;
    }
    extra[key.slice('extraFields.'.length)] = value;
  });
  const normalized = Object.fromEntries(
    Object.entries(extra).filter(([key]) => key.startsWith('cf_')),
  );
  return Object.keys(normalized).length > 0 ? normalized : undefined;
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
