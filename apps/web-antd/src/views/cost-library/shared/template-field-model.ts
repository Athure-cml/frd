import type {
  CostMode,
  CostTableCustomFieldDef,
  CostTableFieldOverride,
  CostTableTemplate,
  CostTableTemplateLayout,
} from '#/api/cost';

import { getFieldCatalog, toFieldCatalogMap } from './field-catalog';
import { getFieldLabel } from './template-layout-utils';

export const CUSTOM_FIELD_PREFIX = 'cf_';

export interface TemplateLayoutFieldItem {
  dataType: 'number' | 'text';
  field: string;
  fixed?: 'left' | 'right';
  isCustom: boolean;
  minWidth?: number;
  required: boolean;
  title: string;
  visible: boolean;
  width?: number;
}

export function isCustomFieldKey(field: string) {
  return field.startsWith(CUSTOM_FIELD_PREFIX);
}

export function customFieldColumnPath(field: string) {
  return `extraFields.${field}`;
}

export function createCustomFieldCode() {
  return `${CUSTOM_FIELD_PREFIX}${Date.now().toString(36)}`;
}

export function resolveLayoutFieldOrder(
  mode: CostMode,
  layout: CostTableTemplateLayout,
) {
  if (layout.fieldOrder?.length) {
    return [...layout.fieldOrder];
  }
  if (layout.fields?.length) {
    return [...layout.fields];
  }
  if (layout.groups?.length) {
    return layout.groups.flatMap((group) => group.fields ?? []);
  }
  return getFieldCatalog(mode).map((entry) => entry.field);
}

function findCustomDef(layout: CostTableTemplateLayout, field: string) {
  return layout.customFields?.find((item) => item.field === field);
}

export function isFieldVisibleInLayout(
  layout: CostTableTemplateLayout,
  field: string,
) {
  return layout.fieldOverrides?.[field]?.visible !== false;
}

export function isFieldRequiredInLayout(
  layout: CostTableTemplateLayout,
  field: string,
) {
  const custom = findCustomDef(layout, field);
  if (custom?.required) {
    return true;
  }
  return layout.fieldOverrides?.[field]?.required === true;
}

export function resolveFieldTitle(
  mode: CostMode,
  field: string,
  layout: CostTableTemplateLayout,
) {
  const custom = findCustomDef(layout, field);
  if (custom?.title?.trim()) {
    return custom.title.trim();
  }
  const override = layout.fieldOverrides?.[field]?.title?.trim();
  if (override) {
    return override;
  }
  return getFieldLabel(mode, field);
}

export function buildLayoutFieldItems(
  mode: CostMode,
  layout: CostTableTemplateLayout,
): TemplateLayoutFieldItem[] {
  const order = resolveLayoutFieldOrder(mode, layout);
  const catalogMap = toFieldCatalogMap(getFieldCatalog(mode));

  return order.map((field) => {
    const custom = findCustomDef(layout, field);
    const isCustom = !!custom || isCustomFieldKey(field);
    const catalog = catalogMap.get(field);
    const override = layout.fieldOverrides?.[field];
    return {
      dataType: custom?.dataType ?? 'text',
      field,
      fixed:
        override?.fixed === 'left' || override?.fixed === 'right'
          ? override.fixed
          : undefined,
      isCustom,
      minWidth: override?.minWidth ?? catalog?.minWidth,
      required: isFieldRequiredInLayout(layout, field),
      title: resolveFieldTitle(mode, field, layout),
      visible: isFieldVisibleInLayout(layout, field),
      width: override?.width ?? catalog?.width,
    };
  });
}

function patchOverride(
  layout: CostTableTemplateLayout,
  field: string,
  patch: Partial<CostTableFieldOverride>,
): CostTableTemplateLayout {
  const overrides = { ...layout.fieldOverrides };
  const current = { ...overrides[field], ...patch };
  const cleaned = Object.fromEntries(
    Object.entries(current).filter(([, value]) => value !== undefined),
  ) as CostTableFieldOverride;
  if (Object.keys(cleaned).length === 0) {
    delete overrides[field];
  } else {
    overrides[field] = cleaned;
  }
  return {
    ...layout,
    fieldOverrides: Object.keys(overrides).length > 0 ? overrides : undefined,
  };
}

function applyItemFieldOverrides(
  mode: CostMode,
  item: TemplateLayoutFieldItem,
  layout: CostTableTemplateLayout,
  nextLayout: CostTableTemplateLayout,
): CostTableTemplateLayout {
  const override: CostTableFieldOverride = {};

  if (!item.isCustom) {
    const defaultTitle = getFieldLabel(mode, item.field);
    if (item.title.trim() && item.title.trim() !== defaultTitle) {
      override.title = item.title.trim();
    }
    if (item.required) {
      override.required = true;
    }
  }

  if (!item.visible) {
    override.visible = false;
  }
  if (item.width) {
    override.width = item.width;
  }
  if (item.minWidth) {
    override.minWidth = item.minWidth;
  }
  if (item.fixed) {
    override.fixed = item.fixed;
  } else if (layout.fieldOverrides?.[item.field]?.fixed) {
    override.fixed = null;
  }

  if (Object.keys(override).length === 0) {
    return nextLayout;
  }
  return patchOverride(nextLayout, item.field, override);
}

export function applyLayoutFieldItems(
  mode: CostMode,
  items: TemplateLayoutFieldItem[],
  layout: CostTableTemplateLayout,
): CostTableTemplateLayout {
  const fieldOrder = items.map((item) => item.field);
  const selectedSet = new Set(fieldOrder);
  const customFieldMap = new Map<string, CostTableCustomFieldDef>();

  for (const def of layout.customFields ?? []) {
    if (!selectedSet.has(def.field)) {
      customFieldMap.set(def.field, def);
    }
  }

  let nextLayout: CostTableTemplateLayout = {
    ...layout,
    customFields: undefined,
    fieldOrder,
    fieldOverrides: undefined,
  };

  for (const item of items) {
    if (item.isCustom) {
      customFieldMap.set(item.field, {
        dataType: item.dataType,
        field: item.field,
        required: item.required,
        title: item.title.trim(),
      });
    }

    nextLayout = applyItemFieldOverrides(mode, item, layout, nextLayout);
  }

  nextLayout.customFields =
    customFieldMap.size > 0 ? [...customFieldMap.values()] : undefined;

  if (mode === 'road') {
    nextLayout = applyRoadGroupsFromOrder(mode, fieldOrder, nextLayout);
    return nextLayout;
  }

  if (mode === 'fumigation') {
    return applyFumigationGroupsFromOrder(fieldOrder, nextLayout);
  }

  return {
    ...nextLayout,
    fields: fieldOrder,
  };
}

const ROAD_CUSTOM_GROUP = {
  headerClassName: 'road-header-green',
  key: 'custom',
  labelKey: 'page.costLibrary.roadGroups.custom',
} as const;

function applyRoadGroupsFromOrder(
  mode: CostMode,
  fieldOrder: string[],
  layout: CostTableTemplateLayout,
) {
  const catalogMap = toFieldCatalogMap(getFieldCatalog(mode));
  const grouped = new Map<string, string[]>();
  for (const field of fieldOrder) {
    if (isCustomFieldKey(field)) {
      const list = grouped.get(ROAD_CUSTOM_GROUP.key) ?? [];
      list.push(field);
      grouped.set(ROAD_CUSTOM_GROUP.key, list);
      continue;
    }
    const group = catalogMap.get(field)?.group ?? 'basic';
    const list = grouped.get(group) ?? [];
    list.push(field);
    grouped.set(group, list);
  }

  const groups = [
    {
      fields: grouped.get('basic') ?? [],
      headerClassName: 'road-header-green',
      key: 'basic',
      labelKey: 'page.costLibrary.roadGroups.basic',
    },
    {
      fields: grouped.get('freight') ?? [],
      headerClassName: 'road-header-freight',
      key: 'freight',
      labelKey: 'page.costLibrary.roadGroups.freight',
    },
    {
      fields: grouped.get('surcharge') ?? [],
      headerClassName: 'road-header-green',
      key: 'surcharge',
      labelKey: 'page.costLibrary.roadGroups.surcharge',
    },
  ];

  const customFields = grouped.get(ROAD_CUSTOM_GROUP.key) ?? [];
  if (customFields.length > 0) {
    groups.push({
      fields: customFields,
      headerClassName: ROAD_CUSTOM_GROUP.headerClassName,
      key: ROAD_CUSTOM_GROUP.key,
      labelKey: ROAD_CUSTOM_GROUP.labelKey,
    });
  }

  return {
    ...layout,
    groups: groups.filter((group) => group.fields.length > 0),
  };
}

function applyFumigationGroupsFromOrder(
  fieldOrder: string[],
  layout: CostTableTemplateLayout,
): CostTableTemplateLayout {
  const pick = (allowed: readonly string[]) =>
    fieldOrder.filter((field) => allowed.includes(field));

  return {
    ...layout,
    fieldOrder,
    fields: fieldOrder,
    groups: [
      {
        fields: pick([
          'nonOakOutdoor',
          'nonOakIndoor',
          'nonOakQuoteSummer',
          'nonOakQuoteWinter',
        ]),
        headerClassName: 'fumigation-header-primary',
        key: 'nonOak',
        labelKey: 'page.costLibrary.fumigationGroups.nonOak',
      },
      {
        fields: pick([
          'oakOutdoor',
          'oakIndoor',
          'oakQuoteSummer',
          'oakQuoteWinter',
        ]),
        headerClassName: 'fumigation-header-primary',
        key: 'oak',
        labelKey: 'page.costLibrary.fumigationGroups.oak',
      },
    ].filter((group) => group.fields.length > 0),
  };
}

export interface TemplateLibraryFieldEntry {
  field: string;
  isCustom: boolean;
  title: string;
}

export function listLibraryFields(
  mode: CostMode,
  layout: CostTableTemplateLayout,
): TemplateLibraryFieldEntry[] {
  const selected = new Set(resolveLayoutFieldOrder(mode, layout));
  const catalog = getFieldCatalog(mode)
    .filter((entry) => !selected.has(entry.field))
    .map((entry) => ({
      field: entry.field,
      isCustom: false,
      title: getFieldLabel(mode, entry.field),
    }));

  const stagedCustom = (layout.customFields ?? [])
    .filter((def) => !selected.has(def.field))
    .map((def) => ({
      field: def.field,
      isCustom: true,
      title: def.title,
    }));

  return [...catalog, ...stagedCustom];
}

export function listAvailableCatalogFields(
  mode: CostMode,
  items: TemplateLayoutFieldItem[],
) {
  const selected = new Set(items.map((item) => item.field));
  return getFieldCatalog(mode).filter((entry) => !selected.has(entry.field));
}

export function stageCustomField(
  layout: CostTableTemplateLayout,
  title: string,
): CostTableTemplateLayout {
  const normalized = title.trim();
  if (!normalized) {
    return layout;
  }
  const field = createCustomFieldCode();
  return {
    ...layout,
    customFields: [
      ...(layout.customFields ?? []),
      {
        dataType: 'text',
        field,
        required: false,
        title: normalized,
      },
    ],
  };
}

export function removeStagedCustomField(
  layout: CostTableTemplateLayout,
  field: string,
) {
  if (!isCustomFieldKey(field)) {
    return layout;
  }
  const customFields = layout.customFields?.filter(
    (item) => item.field !== field,
  );
  return {
    ...layout,
    customFields: customFields?.length ? customFields : undefined,
  };
}

export function addFieldFromLibrary(
  mode: CostMode,
  items: TemplateLayoutFieldItem[],
  field: string,
  layout: CostTableTemplateLayout,
) {
  if (items.some((item) => item.field === field)) {
    return items;
  }

  const custom = layout.customFields?.find((item) => item.field === field);
  if (custom) {
    return [
      ...items,
      {
        dataType: custom.dataType,
        field: custom.field,
        isCustom: true,
        minWidth: 120,
        required: custom.required ?? false,
        title: custom.title,
        visible: true,
      },
    ];
  }

  return addCatalogField(mode, items, field);
}

export function addCatalogField(
  mode: CostMode,
  items: TemplateLayoutFieldItem[],
  field: string,
) {
  const catalogMap = toFieldCatalogMap(getFieldCatalog(mode));
  const entry = catalogMap.get(field);
  if (!entry || items.some((item) => item.field === field)) {
    return items;
  }
  return [
    ...items,
    {
      dataType: 'text' as const,
      field,
      isCustom: false,
      minWidth: entry.minWidth,
      required: false,
      title: getFieldLabel(mode, field),
      visible: true,
      width: entry.width,
    },
  ];
}

export function addCustomField(
  items: TemplateLayoutFieldItem[],
  title: string,
) {
  const normalized = title.trim();
  if (!normalized) {
    return items;
  }
  const field = createCustomFieldCode();
  return [
    ...items,
    {
      dataType: 'text' as const,
      field,
      isCustom: true,
      minWidth: 120,
      required: false,
      title: normalized,
      visible: true,
    },
  ];
}

export function removeLayoutField(
  items: TemplateLayoutFieldItem[],
  field: string,
) {
  return items.filter((item) => item.field !== field);
}

export function updateLayoutFieldItem(
  items: TemplateLayoutFieldItem[],
  field: string,
  patch: Partial<TemplateLayoutFieldItem>,
) {
  return items.map((item) =>
    item.field === field ? { ...item, ...patch } : item,
  );
}

export function getVisibleFormFields(template?: CostTableTemplate) {
  if (!template) {
    return [];
  }
  return buildLayoutFieldItems(template.mode, template.layout).filter(
    (item) => item.visible,
  );
}

export function getRequiredFields(template?: CostTableTemplate) {
  if (!template) {
    return [];
  }
  return buildLayoutFieldItems(template.mode, template.layout)
    .filter((item) => item.visible && item.required)
    .map((item) => item.field);
}

export function countVisibleLayoutFields(
  mode: CostMode,
  layout: CostTableTemplateLayout,
) {
  return buildLayoutFieldItems(mode, layout).filter((item) => item.visible)
    .length;
}
