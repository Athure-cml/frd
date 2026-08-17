import type { FieldCatalogEntry } from './field-catalog';

import type { OnActionClickFn, VxeTableGridOptions } from '#/adapter/vxe-table';
import type {
  CostTableFieldOverride,
  CostTableTemplateLayout,
} from '#/api/cost';

import { h } from 'vue';

import { $t } from '#/locales';

import { formatAmount } from '../road/formatters';
import { applyColumnBgParams, resolveColumnBgColor } from './column-bg-style';
import { resolveCompactColumnSize } from './column-width';
import {
  appendCostOperationColumn,
  appendCostStatusColumn,
  buildCostCheckboxColumn,
} from './columns';
import { coerceAmountValue } from './fee-unit-pairs';
import { getFieldCatalog, toFieldCatalogMap } from './field-catalog';
import {
  customFieldColumnPath,
  isCustomFieldKey,
  isFieldRequiredInLayout,
  isFieldVisibleInLayout,
  resolveFieldTitle,
} from './template-field-model';

const OUTDOOR_FIELDS = new Set([
  'cf_fum_outdoor_eff',
  'outdoorNonOak',
  'outdoorOak',
  'outdoorValidity',
]);
const INDOOR_FIELDS = new Set([
  'cf_fum_indoor_eff',
  'indoorNonOak',
  'indoorOak',
  'indoorValidity',
]);

export const FUMIGATION_GROUP_DEFS = {
  indoor: {
    key: 'indoor',
    labelKey: 'page.costLibrary.fumigationGroups.indoor',
  },
  outdoor: {
    key: 'outdoor',
    labelKey: 'page.costLibrary.fumigationGroups.outdoor',
  },
} as const;

export type FumigationColumnSegment =
  | { field: string; type: 'leaf' }
  | { fields: string[]; groupKey: 'indoor' | 'outdoor'; type: 'group' };

function resolveFumigationFieldOrder(layout: CostTableTemplateLayout) {
  if (layout.fieldOrder?.length) {
    return layout.fieldOrder;
  }
  if (layout.fields?.length) {
    return layout.fields;
  }
  if (layout.groups?.length) {
    return layout.groups.flatMap((group) => group.fields ?? []);
  }
  return getFieldCatalog('fumigation').map((entry) => entry.field);
}

export function resolveFumigationColumnSegments(
  layout: CostTableTemplateLayout,
): FumigationColumnSegment[] {
  const order = resolveFumigationFieldOrder(layout);
  const used = new Set<string>();
  const segments: FumigationColumnSegment[] = [];

  const collectGroup = (
    startIndex: number,
    groupKey: 'indoor' | 'outdoor',
    allowed: Set<string>,
  ) => {
    const fields: string[] = [];
    let index = startIndex;
    while (index < order.length) {
      const field = order[index];
      if (
        !field ||
        !allowed.has(field) ||
        used.has(field) ||
        !isFieldVisibleInLayout(layout, field)
      ) {
        break;
      }
      used.add(field);
      fields.push(field);
      index += 1;
    }
    if (fields.length > 0) {
      segments.push({ fields, groupKey, type: 'group' });
    }
    return index;
  };

  let index = 0;
  while (index < order.length) {
    const field = order[index];
    if (!field || used.has(field) || !isFieldVisibleInLayout(layout, field)) {
      index += 1;
      continue;
    }

    if (OUTDOOR_FIELDS.has(field)) {
      index = collectGroup(index, 'outdoor', OUTDOOR_FIELDS);
      continue;
    }

    if (INDOOR_FIELDS.has(field)) {
      index = collectGroup(index, 'indoor', INDOOR_FIELDS);
      continue;
    }

    used.add(field);
    segments.push({ field, type: 'leaf' });
    index += 1;
  }

  return segments;
}

function buildRequiredHeaderSlot(title: string) {
  return () =>
    h('span', { class: 'col-required-header' }, [
      h('span', { class: 'col-required-mark' }, '*'),
      h('span', null, title),
    ]);
}

function buildLeafColumn(
  field: string,
  entry: FieldCatalogEntry,
  options: {
    override?: CostTableFieldOverride;
    required?: boolean;
    title: string;
  },
) {
  const size = resolveCompactColumnSize(options.title, entry, {
    required: options.required,
  });
  const minWidth =
    options.override?.minWidth ?? entry.minWidth ?? size.minWidth;
  const width = options.override?.width ?? entry.width;
  const column: Record<string, unknown> = {
    align: entry.align,
    className: entry.className,
    field,
    headerClassName: options.required ? 'col-required' : undefined,
    minWidth,
    showOverflow: entry.showOverflow ?? true,
    sortable: options.override?.sortable === true,
    title: options.title,
  };
  if (typeof width === 'number' && width > 0) {
    column.width = width;
  }

  if (isCustomFieldKey(field)) {
    column.field = customFieldColumnPath(field);
    if (options.override?.sortable === true) {
      column.sortBy = ({
        row,
      }: {
        row: { extraFields?: Record<string, unknown> };
      }) => {
        const raw = row.extraFields?.[field];
        if (raw === null || raw === undefined || raw === '') {
          return null;
        }
        if (entry.format === 'amount') {
          return coerceAmountValue(raw);
        }
        const asNum = coerceAmountValue(raw);
        return asNum === null ? String(raw) : asNum;
      };
    }
    column.formatter = ({
      cellValue,
      row,
    }: {
      cellValue: unknown;
      row: { extraFields?: Record<string, unknown> };
    }) => {
      const value = cellValue ?? row.extraFields?.[field];
      if (value === undefined || value === null) {
        return '';
      }
      if (entry.format === 'amount' && typeof value === 'number') {
        return formatAmount(value);
      }
      return String(value);
    };
  } else if (entry.format === 'amount') {
    column.formatter = ({ cellValue }: { cellValue: number }) =>
      formatAmount(cellValue);
  }

  if (options.required) {
    column.slots = {
      header: buildRequiredHeaderSlot(options.title),
    };
  }

  if (options.override?.fixed) {
    column.fixed = options.override.fixed;
  }
  applyColumnBgParams(
    column,
    resolveColumnBgColor('fumigation', field, options.override?.bgColor),
  );

  return column;
}

function buildFieldColumn(
  field: string,
  catalogMap: Map<string, FieldCatalogEntry>,
  layout: CostTableTemplateLayout,
) {
  if (!isFieldVisibleInLayout(layout, field)) {
    return null;
  }
  const entry = catalogMap.get(field);
  if (!entry) {
    return null;
  }
  return buildLeafColumn(field, entry, {
    override: layout.fieldOverrides?.[field],
    required: isFieldRequiredInLayout(layout, field),
    title: resolveFieldTitle('fumigation', field, layout),
  });
}

export function buildFumigationColumnsFromLayout<T extends { id: number }>(
  layout: CostTableTemplateLayout,
  options: {
    canEdit?: boolean;
    includeOperation?: boolean;
    nameField?: string;
    nameTitle?: string;
    onActionClick?: OnActionClickFn<T>;
    seqWidth?: number;
  } = {},
): VxeTableGridOptions<T>['columns'] {
  const {
    canEdit = false,
    includeOperation = true,
    nameField = 'region',
    nameTitle = $t('page.costLibrary.fumigationFields.region'),
    onActionClick = () => {},
    seqWidth = 56,
  } = options;

  const catalogMap = toFieldCatalogMap(getFieldCatalog('fumigation'));
  layout.customFields?.forEach((def) => {
    catalogMap.set(def.field, {
      field: def.field,
      format: def.dataType === 'number' ? 'amount' : undefined,
      labelKey: def.title,
    });
  });
  resolveFumigationFieldOrder(layout).forEach((field) => {
    if (!isCustomFieldKey(field) || catalogMap.has(field)) {
      return;
    }
    catalogMap.set(field, {
      field,
      labelKey: resolveFieldTitle('fumigation', field, layout),
    });
  });

  const dataColumns = resolveFumigationColumnSegments(layout)
    .map((segment) => {
      if (segment.type === 'leaf') {
        return buildFieldColumn(segment.field, catalogMap, layout);
      }

      const groupDef = FUMIGATION_GROUP_DEFS[segment.groupKey];
      const children = segment.fields
        .map((field) => buildFieldColumn(field, catalogMap, layout))
        .filter(Boolean);
      if (children.length === 0) {
        return null;
      }
      return {
        children,
        title: $t(groupDef.labelKey),
      };
    })
    .filter(Boolean);

  const columns = [
    buildCostCheckboxColumn(),
    {
      fixed: 'left' as const,
      title: '#',
      type: 'seq',
      width: seqWidth,
    },
    ...dataColumns,
  ] as VxeTableGridOptions<T>['columns'];

  if (!includeOperation) {
    appendCostStatusColumn(columns);
    return columns;
  }

  appendCostStatusColumn(columns);

  return appendCostOperationColumn(
    columns,
    canEdit,
    onActionClick,
    nameField,
    nameTitle,
  );
}
