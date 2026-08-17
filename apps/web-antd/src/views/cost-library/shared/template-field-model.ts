import type {
  CostMode,
  CostTableCustomFieldDef,
  CostTableFieldOverride,
  CostTableTemplate,
  CostTableTemplateLayout,
} from '#/api/cost';

import {
  COLUMN_BG_NONE,
  defaultColumnBgColor,
  normalizeColumnBgColor,
} from './column-bg-style';
import { getFieldCatalog, toFieldCatalogMap } from './field-catalog';
import { getFieldLabel } from './template-layout-utils';

export const CUSTOM_FIELD_PREFIX = 'cf_';

export interface TemplateLayoutFieldItem {
  bgColor?: string;
  dataType: 'date' | 'number' | 'text';
  field: string;
  fixed?: 'left' | 'right';
  isCustom: boolean;
  minWidth?: number;
  required: boolean;
  sortable: boolean;
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
  const ensured = mode === 'road' ? ensureRoadFeeUnitFields(layout) : layout;
  const order = resolveLayoutFieldOrderRaw(ensured);
  if (order.length > 0) {
    return order;
  }
  return getFieldCatalog(mode).map((entry) => entry.field);
}

/** 为金额列补齐单位 companion；按 key 配对，插在金额后，不依赖相邻识别 */
export function ensureRoadFeeUnitFields(
  layout: CostTableTemplateLayout,
): CostTableTemplateLayout {
  const pairs: Array<{ amount: string; title: string; unit: string }> = [
    {
      amount: 'waitingFee',
      title: 'WAITING UNIT',
      unit: 'cf_road_waiting_unit',
    },
    {
      amount: 'cf_road_yard_storage',
      title: 'YARD STORAGE UNIT',
      unit: 'cf_road_yard_storage_unit',
    },
    {
      amount: 'cf_road_extra_chassis',
      title: 'EXTRA CHASSIS UNIT',
      unit: 'cf_road_extra_chassis_unit',
    },
  ];

  const order = resolveLayoutFieldOrderRaw(layout);
  if (order.length === 0) {
    return layout;
  }
  const customFields = [...(layout.customFields ?? [])];
  const fieldOverrides = { ...layout.fieldOverrides };
  let changed = false;

  for (const pair of pairs) {
    if (!order.includes(pair.amount)) {
      continue;
    }
    if (!order.includes(pair.unit)) {
      order.splice(order.indexOf(pair.amount) + 1, 0, pair.unit);
      changed = true;
    }
    if (!customFields.some((item) => item.field === pair.unit)) {
      customFields.push({
        dataType: 'text',
        field: pair.unit,
        title: pair.title,
      });
      changed = true;
    }
    if (!fieldOverrides[pair.unit]?.title) {
      fieldOverrides[pair.unit] = {
        ...fieldOverrides[pair.unit],
        title: pair.title,
      };
      changed = true;
    }
  }

  if (!changed) {
    return layout;
  }
  return {
    ...layout,
    customFields,
    fieldOrder: order,
    fieldOverrides,
    fields: order,
  };
}

function resolveLayoutFieldOrderRaw(layout: CostTableTemplateLayout) {
  if (layout.fieldOrder?.length) {
    return [...layout.fieldOrder];
  }
  if (layout.fields?.length) {
    return [...layout.fields];
  }
  if (layout.groups?.length) {
    return layout.groups.flatMap((group) => group.fields ?? []);
  }
  return [] as string[];
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

export function isFieldSortableInLayout(
  layout: CostTableTemplateLayout,
  field: string,
) {
  return layout.fieldOverrides?.[field]?.sortable === true;
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
  const ensured = mode === 'road' ? ensureRoadFeeUnitFields(layout) : layout;
  const order = resolveLayoutFieldOrder(mode, ensured);

  return order.map((field) => {
    const custom = findCustomDef(ensured, field);
    const isCustom = !!custom || isCustomFieldKey(field);
    const override = ensured.fieldOverrides?.[field];
    const storedBg = override?.bgColor?.trim();
    const bgColor =
      storedBg === COLUMN_BG_NONE
        ? undefined
        : (normalizeColumnBgColor(storedBg) ??
          defaultColumnBgColor(mode, field));
    return {
      bgColor,
      dataType: (custom?.dataType as 'date' | 'number' | 'text') ?? 'text',
      field,
      fixed:
        override?.fixed === 'left' || override?.fixed === 'right'
          ? override.fixed
          : undefined,
      isCustom,
      // 列宽默认由表头估算；仅模板显式覆盖时带入编辑器
      minWidth: override?.minWidth,
      required: isFieldRequiredInLayout(ensured, field),
      sortable: isFieldSortableInLayout(ensured, field),
      title: resolveFieldTitle(mode, field, ensured),
      visible: isFieldVisibleInLayout(ensured, field),
      width: override?.width,
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
  const nextOverrides =
    Object.keys(cleaned).length === 0
      ? Object.fromEntries(
          Object.entries(overrides).filter(([key]) => key !== field),
        )
      : { ...overrides, [field]: cleaned };
  return {
    ...layout,
    fieldOverrides:
      Object.keys(nextOverrides).length > 0 ? nextOverrides : undefined,
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
  if (item.sortable) {
    override.sortable = true;
  }
  // 仅持久化用户在编辑器中填写的列宽，不把字段目录默认宽写进模板
  if (item.width) {
    override.width = item.width;
  }
  if (item.fixed) {
    override.fixed = item.fixed;
  } else if (layout.fieldOverrides?.[item.field]?.fixed) {
    override.fixed = null;
  }

  const bgColor = item.bgColor?.trim();
  if (bgColor) {
    override.bgColor = bgColor;
  } else if (defaultColumnBgColor(mode, item.field)) {
    // 总价等默认高亮列：用户清除后写入 none，避免下次再套默认色
    override.bgColor = COLUMN_BG_NONE;
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

  if (mode === 'sea') {
    return applySeaGroupsFromOrder(fieldOrder, nextLayout);
  }

  return {
    ...nextLayout,
    fields: fieldOrder,
  };
}

const ROAD_CUSTOM_GROUP = {
  headerClassName: 'road-header-extra',
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
    const group = catalogMap.get(field)?.group ?? 'route';
    const list = grouped.get(group) ?? [];
    list.push(field);
    grouped.set(group, list);
  }

  const groups = [
    {
      fields: grouped.get('route') ?? [],
      headerClassName: 'road-header-route',
      key: 'route',
      labelKey: 'page.costLibrary.roadGroups.route',
    },
    {
      fields: grouped.get('freight') ?? [],
      headerClassName: 'road-header-freight',
      key: 'freight',
      labelKey: 'page.costLibrary.roadGroups.freight',
    },
    {
      fields: grouped.get('extra') ?? [],
      headerClassName: 'road-header-extra',
      key: 'extra',
      labelKey: 'page.costLibrary.roadGroups.extra',
    },
    {
      fields: grouped.get('meta') ?? [],
      headerClassName: 'road-header-meta',
      key: 'meta',
      labelKey: 'page.costLibrary.roadGroups.meta',
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
          'outdoorNonOak',
          'outdoorOak',
          'cf_fum_outdoor_eff',
          'outdoorValidity',
        ]),
        key: 'outdoor',
        labelKey: 'page.costLibrary.fumigationGroups.outdoor',
      },
      {
        fields: pick([
          'indoorNonOak',
          'indoorOak',
          'cf_fum_indoor_eff',
          'indoorValidity',
        ]),
        key: 'indoor',
        labelKey: 'page.costLibrary.fumigationGroups.indoor',
      },
    ].filter((group) => group.fields.length > 0),
  };
}

function applySeaGroupsFromOrder(
  fieldOrder: string[],
  layout: CostTableTemplateLayout,
): CostTableTemplateLayout {
  const pick = (allowed: readonly string[]) =>
    fieldOrder.filter((field) => allowed.includes(field));

  const surchargeFields = pick([
    'buc',
    'cf_sea_bunker_eff',
    'cf_seaBunkerEff',
    'bucValidDate',
    'ebs',
    'ebsValidDate',
    'gri',
    'griValidDate',
    'others',
    'cf_sea_others_eff',
    'cf_seaOthersEff',
    'othersValidDate',
  ]);

  return {
    ...layout,
    fieldOrder,
    fields: fieldOrder,
    groups:
      surchargeFields.length > 0
        ? [
            {
              fields: surchargeFields,
              headerClassName: 'sea-header-surcharge',
              key: 'surcharge',
              labelKey: 'page.costLibrary.seaGroups.surcharge',
            },
          ]
        : [],
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
        required: custom.required ?? false,
        sortable: false,
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
      required: false,
      sortable: false,
      title: getFieldLabel(mode, field),
      visible: true,
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
      required: false,
      sortable: false,
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
