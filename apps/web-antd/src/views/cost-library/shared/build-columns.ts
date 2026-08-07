import type { FieldCatalogEntry } from './field-catalog';

import type { OnActionClickFn, VxeTableGridOptions } from '#/adapter/vxe-table';
import type {
  CostMode,
  CostTableFieldOverride,
  CostTableTemplate,
  CostTableTemplateLayout,
} from '#/api/cost';

import { h } from 'vue';

import { $t } from '#/locales';

import { formatAmount, formatPercent } from '../road/formatters';
import { buildFumigationColumnsFromLayout } from './build-fumigation-columns';
import {
  appendCostOperationColumn,
  appendCostStatusColumn,
  buildCostCheckboxColumn,
} from './columns';
import { getDefaultTemplate } from './default-templates';
import { getFieldCatalog, toFieldCatalogMap } from './field-catalog';
import { formatPrice } from './formatters';
import { costStatusTagOptions } from './tags';
import {
  customFieldColumnPath,
  isCustomFieldKey,
  isFieldRequiredInLayout,
  isFieldVisibleInLayout,
  resolveFieldTitle,
  resolveLayoutFieldOrder,
} from './template-field-model';

export interface BuildColumnsOptions<T extends { id: number }> {
  canEdit: boolean;
  includeOperation?: boolean;
  mode: CostMode;
  nameField: string;
  nameTitle: string;
  onActionClick: OnActionClickFn<T>;
  seqWidth?: number;
  template?: CostTableTemplate;
}

function buildFormatter(entry: FieldCatalogEntry) {
  if (entry.format === 'amount') {
    return ({ cellValue }: { cellValue: number }) => formatAmount(cellValue);
  }
  if (entry.format === 'percent') {
    return ({ cellValue }: { cellValue: number }) => formatPercent(cellValue);
  }
  if (entry.format === 'price') {
    return ({
      cellValue,
      row,
    }: {
      cellValue: number;
      row: { currency?: string };
    }) => formatPrice(cellValue, row.currency);
  }
  return undefined;
}

function buildCatalogMap(mode: CostMode, layout: CostTableTemplateLayout) {
  const map = toFieldCatalogMap(getFieldCatalog(mode));
  layout.customFields?.forEach((def) => {
    map.set(def.field, {
      field: def.field,
      format: def.dataType === 'number' ? 'amount' : undefined,
      labelKey: def.title,
      minWidth: 120,
    });
  });
  resolveLayoutFieldOrder(mode, layout).forEach((field) => {
    if (!isCustomFieldKey(field) || map.has(field)) {
      return;
    }
    map.set(field, {
      field,
      labelKey: resolveFieldTitle(mode, field, layout),
      minWidth: 120,
    });
  });
  return map;
}

function buildRequiredHeaderSlot(title: string) {
  return () => [
    h('span', { class: 'col-required-mark' }, '*'),
    h('span', null, title),
  ];
}

function buildLeafColumn(
  entry: FieldCatalogEntry,
  options: {
    override?: CostTableFieldOverride;
    required?: boolean;
    title: string;
  },
) {
  const column: Record<string, unknown> = {
    align: entry.align,
    field: entry.field,
    headerClassName: options.required ? 'col-required' : undefined,
    minWidth: options.override?.minWidth ?? entry.minWidth,
    title: options.title,
    width: options.override?.width ?? entry.width,
  };

  if (options.required) {
    column.slots = {
      header: buildRequiredHeaderSlot(options.title),
    };
  }

  if (entry.align) column.align = entry.align;
  if (entry.className) column.className = entry.className;
  if (entry.showOverflow) column.showOverflow = entry.showOverflow;
  if (entry.width) column.width = entry.width;
  if (options.override?.width) column.width = options.override.width;
  if (options.override?.fixed) column.fixed = options.override.fixed;

  if (isCustomFieldKey(entry.field)) {
    column.field = customFieldColumnPath(entry.field);
    column.showOverflow = entry.showOverflow ?? true;
    column.formatter = ({
      cellValue,
      row,
    }: {
      cellValue: unknown;
      row: { extraFields?: Record<string, unknown> };
    }) => {
      const value = cellValue ?? row.extraFields?.[entry.field];
      if (value === undefined || value === null) {
        return '';
      }
      if (entry.format === 'amount' && typeof value === 'number') {
        return formatAmount(value);
      }
      return String(value);
    };
  } else {
    const formatter = buildFormatter(entry);
    if (formatter) {
      column.formatter = formatter;
    }
  }

  if (entry.format === 'tag') {
    column.cellRender = {
      name: 'CellTag',
      options: costStatusTagOptions(),
    };
  }

  return column;
}

function resolveFieldColumns(
  mode: CostMode,
  layout: CostTableTemplateLayout,
  catalogMap: Map<string, FieldCatalogEntry>,
) {
  return resolveLayoutFieldOrder(mode, layout)
    .filter((field) => isFieldVisibleInLayout(layout, field))
    .map((field) => {
      const entry = catalogMap.get(field);
      if (!entry) return null;
      return buildLeafColumn(entry, {
        override: layout.fieldOverrides?.[field],
        required: isFieldRequiredInLayout(layout, field),
        title: resolveFieldTitle(mode, field, layout),
      });
    })
    .filter(Boolean);
}

function buildLayoutColumns(
  mode: CostMode,
  layout: CostTableTemplateLayout,
  catalogMap: Map<string, FieldCatalogEntry>,
  options?: { flattenGroups?: boolean },
) {
  const order = resolveLayoutFieldOrder(mode, layout);
  const groups = layout.groups ?? [];

  if (options?.flattenGroups || groups.length === 0 || order.length === 0) {
    return resolveFieldColumns(mode, layout, catalogMap);
  }

  // fieldOrder + groups：按顺序输出叶子列，连续同组字段合并为二级表头
  const fieldToGroup = new Map<string, (typeof groups)[number]>();
  groups.forEach((group) => {
    group.fields?.forEach((field) => fieldToGroup.set(field, group));
  });

  const columns: Record<string, unknown>[] = [];
  let index = 0;
  while (index < order.length) {
    const field = order[index];
    if (!field || !isFieldVisibleInLayout(layout, field)) {
      index += 1;
      continue;
    }
    const group = fieldToGroup.get(field);
    if (!group) {
      const entry = catalogMap.get(field);
      if (entry) {
        columns.push(
          buildLeafColumn(entry, {
            override: layout.fieldOverrides?.[field],
            required: isFieldRequiredInLayout(layout, field),
            title: resolveFieldTitle(mode, field, layout),
          }) as Record<string, unknown>,
        );
      }
      index += 1;
      continue;
    }

    const children: Record<string, unknown>[] = [];
    while (index < order.length) {
      const groupedField = order[index];
      if (
        !groupedField ||
        fieldToGroup.get(groupedField)?.key !== group.key ||
        !isFieldVisibleInLayout(layout, groupedField)
      ) {
        break;
      }
      const entry = catalogMap.get(groupedField);
      if (entry) {
        children.push(
          buildLeafColumn(entry, {
            override: layout.fieldOverrides?.[groupedField],
            required: isFieldRequiredInLayout(layout, groupedField),
            title: resolveFieldTitle(mode, groupedField, layout),
          }) as Record<string, unknown>,
        );
      }
      index += 1;
    }
    if (children.length > 0) {
      columns.push({
        children,
        headerClassName: group.headerClassName,
        title: $t(group.labelKey),
      });
    }
  }

  return columns;
}

export function buildColumnsFromTemplate<T extends { id: number }>(
  options: BuildColumnsOptions<T>,
): VxeTableGridOptions<T>['columns'] {
  const {
    canEdit,
    includeOperation = true,
    mode,
    nameField,
    nameTitle,
    onActionClick,
    seqWidth = 52,
    template = getDefaultTemplate(mode),
  } = options;

  if (mode === 'fumigation') {
    return buildFumigationColumnsFromLayout(template.layout, {
      canEdit,
      includeOperation,
      nameField: 'region',
      nameTitle: $t('page.costLibrary.fumigationFields.region'),
      onActionClick,
      seqWidth,
    });
  }

  const catalogMap = buildCatalogMap(mode, template.layout);
  const dataColumns = buildLayoutColumns(mode, template.layout, catalogMap, {
    flattenGroups: mode === 'road',
  });

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

  appendCostStatusColumn(columns);

  return appendCostOperationColumn(
    columns,
    canEdit,
    onActionClick,
    nameField,
    nameTitle,
  );
}
