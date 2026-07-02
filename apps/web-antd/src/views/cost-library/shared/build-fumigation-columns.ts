import type { FieldCatalogEntry } from './field-catalog';

import type { OnActionClickFn, VxeTableGridOptions } from '#/adapter/vxe-table';
import type {
  CostTableFieldOverride,
  CostTableTemplateLayout,
} from '#/api/cost';

import { h } from 'vue';

import { $t } from '#/locales';

import { formatAmount } from '../road/formatters';
import { appendCostOperationColumn, buildCostCheckboxColumn } from './columns';
import { getFieldCatalog, toFieldCatalogMap } from './field-catalog';
import {
  customFieldColumnPath,
  isCustomFieldKey,
  isFieldRequiredInLayout,
  isFieldVisibleInLayout,
  resolveFieldTitle,
} from './template-field-model';

const PRIMARY_HEADER = 'fumigation-header-primary';
const QUOTE_HEADER = 'fumigation-header-quote';

const NON_OAK_FIELDS = new Set([
  'nonOakIndoor',
  'nonOakOutdoor',
  'nonOakQuoteSummer',
  'nonOakQuoteWinter',
]);
const OAK_FIELDS = new Set([
  'oakIndoor',
  'oakOutdoor',
  'oakQuoteSummer',
  'oakQuoteWinter',
]);
const QUOTE_FIELDS = new Set([
  'nonOakQuoteSummer',
  'nonOakQuoteWinter',
  'oakQuoteSummer',
  'oakQuoteWinter',
]);

export const FUMIGATION_GROUP_DEFS = {
  nonOak: {
    headerClassName: PRIMARY_HEADER,
    key: 'nonOak',
    labelKey: 'page.costLibrary.fumigationGroups.nonOak',
  },
  oak: {
    headerClassName: PRIMARY_HEADER,
    key: 'oak',
    labelKey: 'page.costLibrary.fumigationGroups.oak',
  },
} as const;

export type FumigationColumnSegment =
  | { field: string; type: 'leaf' }
  | { fields: string[]; groupKey: 'nonOak' | 'oak'; type: 'group' };

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
    groupKey: 'nonOak' | 'oak',
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

    if (NON_OAK_FIELDS.has(field)) {
      index = collectGroup(index, 'nonOak', NON_OAK_FIELDS);
      continue;
    }

    if (OAK_FIELDS.has(field)) {
      index = collectGroup(index, 'oak', OAK_FIELDS);
      continue;
    }

    used.add(field);
    segments.push({ field, type: 'leaf' });
    index += 1;
  }

  return segments;
}

function resolveHeaderClass(field: string, groupClassName?: string) {
  if (QUOTE_FIELDS.has(field)) {
    return QUOTE_HEADER;
  }
  if (groupClassName) {
    return groupClassName;
  }
  if (NON_OAK_FIELDS.has(field) || OAK_FIELDS.has(field)) {
    return PRIMARY_HEADER;
  }
  return undefined;
}

function buildRequiredHeaderSlot(title: string) {
  return () => [
    h('span', { class: 'col-required-mark' }, '*'),
    h('span', null, title),
  ];
}

function buildLeafColumn(
  field: string,
  entry: FieldCatalogEntry,
  options: {
    headerClassName?: string;
    override?: CostTableFieldOverride;
    required?: boolean;
    title: string;
  },
) {
  const column: Record<string, unknown> = {
    align: entry.align,
    className: entry.className,
    field,
    headerClassName: options.headerClassName,
    minWidth: options.override?.minWidth ?? entry.minWidth,
    showOverflow: entry.showOverflow ?? isCustomFieldKey(field),
    title: options.title,
    width: options.override?.width ?? entry.width,
  };

  if (isCustomFieldKey(field)) {
    column.field = customFieldColumnPath(field);
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
    column.headerClassName =
      `${options.headerClassName ?? ''} col-required`.trim();
    column.slots = {
      header: buildRequiredHeaderSlot(options.title),
    };
  }

  if (options.override?.fixed) {
    column.fixed = options.override.fixed;
  }

  return column;
}

function buildFieldColumn(
  field: string,
  catalogMap: Map<string, FieldCatalogEntry>,
  layout: CostTableTemplateLayout,
  headerClassName?: string,
) {
  if (!isFieldVisibleInLayout(layout, field)) {
    return null;
  }
  const entry = catalogMap.get(field);
  if (!entry) {
    return null;
  }
  return buildLeafColumn(field, entry, {
    headerClassName: resolveHeaderClass(field, headerClassName),
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
    nameField = 'port',
    nameTitle = $t('page.costLibrary.fumigationFields.port'),
    onActionClick = () => {},
    seqWidth = 56,
  } = options;

  const catalogMap = toFieldCatalogMap(getFieldCatalog('fumigation'));
  layout.customFields?.forEach((def) => {
    catalogMap.set(def.field, {
      field: def.field,
      format: def.dataType === 'number' ? 'amount' : undefined,
      labelKey: def.title,
      minWidth: 120,
    });
  });
  resolveFumigationFieldOrder(layout).forEach((field) => {
    if (!isCustomFieldKey(field) || catalogMap.has(field)) {
      return;
    }
    catalogMap.set(field, {
      field,
      labelKey: resolveFieldTitle('fumigation', field, layout),
      minWidth: 120,
    });
  });

  const dataColumns = resolveFumigationColumnSegments(layout)
    .map((segment) => {
      if (segment.type === 'leaf') {
        const headerClassName = ['port', 'station'].includes(segment.field)
          ? PRIMARY_HEADER
          : undefined;
        return buildFieldColumn(
          segment.field,
          catalogMap,
          layout,
          headerClassName,
        );
      }

      const groupDef = FUMIGATION_GROUP_DEFS[segment.groupKey];
      const children = segment.fields
        .map((field) =>
          buildFieldColumn(field, catalogMap, layout, groupDef.headerClassName),
        )
        .filter(Boolean);
      if (children.length === 0) {
        return null;
      }
      return {
        children,
        headerClassName: groupDef.headerClassName,
        title: $t(groupDef.labelKey),
      };
    })
    .filter(Boolean);

  const columns = [
    ...(canEdit ? [buildCostCheckboxColumn()] : []),
    {
      fixed: 'left' as const,
      title: '#',
      type: 'seq',
      width: seqWidth,
    },
    ...dataColumns,
  ] as VxeTableGridOptions<T>['columns'];

  if (!includeOperation) {
    return columns;
  }

  return appendCostOperationColumn(
    columns,
    canEdit,
    onActionClick,
    nameField,
    nameTitle,
  );
}
