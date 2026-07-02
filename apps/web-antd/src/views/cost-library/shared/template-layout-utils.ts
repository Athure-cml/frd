import type { FieldCatalogEntry } from './field-catalog';

import type { CostMode, CostTableTemplateLayout } from '#/api/cost';

import { $t } from '#/locales';

import { getDefaultTemplate } from './default-templates';
import { getFieldCatalog, toFieldCatalogMap } from './field-catalog';
import {
  applyLayoutFieldItems,
  buildLayoutFieldItems,
  resolveLayoutFieldOrder,
} from './template-field-model';

export const ROAD_GROUP_META = [
  {
    headerClassName: 'road-header-green',
    key: 'basic',
    labelKey: 'page.costLibrary.roadGroups.basic',
  },
  {
    headerClassName: 'road-header-freight',
    key: 'freight',
    labelKey: 'page.costLibrary.roadGroups.freight',
  },
  {
    headerClassName: 'road-header-green',
    key: 'surcharge',
    labelKey: 'page.costLibrary.roadGroups.surcharge',
  },
] as const;

export function createDefaultLayout(mode: CostMode): CostTableTemplateLayout {
  return cloneLayout(getDefaultTemplate(mode).layout);
}

/** 深拷贝 layout，兼容 Vue 响应式代理 */
export function cloneLayout(
  layout: CostTableTemplateLayout,
): CostTableTemplateLayout {
  return JSON.parse(JSON.stringify(layout)) as CostTableTemplateLayout;
}

export function getFieldLabel(mode: CostMode, field: string) {
  const entry = toFieldCatalogMap(getFieldCatalog(mode)).get(field);
  return entry ? $t(entry.labelKey) : field;
}

export function matchesTemplateFieldSearch(
  mode: CostMode,
  query: string,
  field: string,
  title?: string,
) {
  const q = query.trim().toLowerCase();
  if (!q) {
    return true;
  }
  const candidates = [field, title ?? '', getFieldLabel(mode, field)];
  return candidates.some((text) => text.toLowerCase().includes(q));
}

export function getFieldDisplayTitle(
  mode: CostMode,
  field: string,
  layout: CostTableTemplateLayout,
) {
  const custom = layout.fieldOverrides?.[field]?.title?.trim();
  if (custom) {
    return custom;
  }
  return getFieldLabel(mode, field);
}

export function getFieldTitleOverride(
  layout: CostTableTemplateLayout,
  field: string,
) {
  return layout.fieldOverrides?.[field]?.title?.trim() ?? '';
}

export function setFieldTitleOverride(
  layout: CostTableTemplateLayout,
  field: string,
  title: string,
  mode: CostMode,
): CostTableTemplateLayout {
  const normalized = title.trim();
  const defaultLabel = getFieldLabel(mode, field);
  const overrides = { ...layout.fieldOverrides };

  if (!normalized || normalized === defaultLabel) {
    if (overrides[field]) {
      const { title: _removed, ...rest } = overrides[field]!;
      if (Object.keys(rest).length === 0) {
        delete overrides[field];
      } else {
        overrides[field] = rest;
      }
    }
  } else {
    overrides[field] = { ...overrides[field], title: normalized };
  }

  return {
    ...layout,
    fieldOverrides: Object.keys(overrides).length > 0 ? overrides : undefined,
  };
}

function pruneFieldOverrides(
  layout: CostTableTemplateLayout,
  activeFields: string[],
): CostTableTemplateLayout {
  if (!layout.fieldOverrides) {
    return layout;
  }
  const active = new Set(activeFields);
  const overrides = Object.fromEntries(
    Object.entries(layout.fieldOverrides).filter(([key]) => active.has(key)),
  );
  return {
    ...layout,
    fieldOverrides: Object.keys(overrides).length > 0 ? overrides : undefined,
  };
}

export function resolveTemplateDisplayName(name: string) {
  return name?.startsWith('page.') ? $t(name) : name;
}

export function catalogFieldsByGroup(mode: CostMode, groupKey: string) {
  return getFieldCatalog(mode).filter((entry) => entry.group === groupKey);
}

export function catalogFlatFields(mode: CostMode) {
  return getFieldCatalog(mode);
}

export function isFieldSelected(fields: string[] | undefined, field: string) {
  return fields?.includes(field) ?? false;
}

export function toggleField(
  fields: string[],
  field: string,
  selected: boolean,
) {
  if (!selected) {
    return fields.filter((item) => item !== field);
  }
  if (fields.includes(field)) {
    return fields;
  }
  return [...fields, field];
}

export function moveField(fields: string[], field: string, direction: -1 | 1) {
  const index = fields.indexOf(field);
  if (index === -1) {
    return fields;
  }
  const target = index + direction;
  if (target < 0 || target >= fields.length) {
    return fields;
  }
  const next = [...fields];
  const [item] = next.splice(index, 1);
  next.splice(target, 0, item!);
  return next;
}

export function ensureRoadLayout(
  layout: CostTableTemplateLayout,
): CostTableTemplateLayout {
  if (layout.groups?.length) {
    return layout;
  }
  return createDefaultLayout('road');
}

export function ensureFlatLayout(
  mode: 'fumigation' | 'sea',
  layout: CostTableTemplateLayout,
): CostTableTemplateLayout {
  if (layout.fields?.length) {
    return layout;
  }
  return createDefaultLayout(mode);
}

export function countLayoutFields(
  mode: CostMode,
  layout: CostTableTemplateLayout,
) {
  return buildLayoutFieldItems(mode, layout).length;
}

export function roadLayoutToFlatFields(layout: CostTableTemplateLayout) {
  return resolveLayoutFieldOrder('road', layout);
}

export function layoutToEditorFields(
  mode: CostMode,
  layout: CostTableTemplateLayout,
) {
  return resolveLayoutFieldOrder(mode, layout);
}

export function applyEditorFields(
  mode: CostMode,
  fields: string[],
  layout: CostTableTemplateLayout,
) {
  const items = buildLayoutFieldItems(mode, layout).filter((item) =>
    fields.includes(item.field),
  );
  const ordered = fields
    .map((field) => items.find((item) => item.field === field))
    .filter(Boolean) as ReturnType<typeof buildLayoutFieldItems>;
  return applyLayoutFieldItems(mode, ordered, layout);
}

export function fieldEntriesForGroup(
  catalog: FieldCatalogEntry[],
  groupKey: string,
) {
  return catalog.filter((entry) => entry.group === groupKey);
}

export function sortCatalogBySelection(
  catalog: FieldCatalogEntry[],
  selectedFields: string[],
  groupKey?: string,
) {
  const catalogMap = toFieldCatalogMap(catalog);
  const selected = selectedFields.map((field) => {
    const entry = catalogMap.get(field);
    if (entry) {
      return entry;
    }
    return {
      field,
      group: groupKey ?? '',
      labelKey: field,
    } satisfies FieldCatalogEntry;
  });
  const unselected = catalog.filter(
    (entry) => !selectedFields.includes(entry.field),
  );
  return { selected, unselected };
}

export function fieldDisplayOrder(fields: string[], field: string) {
  const index = fields.indexOf(field);
  return index === -1 ? undefined : index + 1;
}
