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
import { applyColumnBgParams, resolveColumnBgColor } from './column-bg-style';
import { resolveCompactColumnSize } from './column-width';
import {
  appendCostOperationColumn,
  appendCostStatusColumn,
  buildCostCheckboxColumn,
} from './columns';
import { getDefaultTemplate } from './default-templates';
import {
  coerceAmountValue,
  formatAmountWithUnit,
  isRoadFeeUnitField,
  readRowUnit,
  resolveRoadFeeUnitField,
} from './fee-unit-pairs';
import { getFieldCatalog, toFieldCatalogMap } from './field-catalog';
import { formatDateMd, formatPrice } from './formatters';
import { costStatusTagOptions } from './tags';
import {
  customFieldColumnPath,
  ensureRoadFeeUnitFields,
  isCustomFieldKey,
  isFieldRequiredInLayout,
  isFieldVisibleInLayout,
  resolveFieldTitle,
  resolveLayoutFieldOrder,
} from './template-field-model';

export interface BuildColumnsOptions<T extends { id: number }> {
  canEdit: boolean;
  enableRenew?: boolean;
  includeOperation?: boolean;
  mode: CostMode;
  nameField: string;
  nameTitle: string;
  onActionClick: OnActionClickFn<T>;
  seqWidth?: number;
  template?: CostTableTemplate;
}

/** 海运表格日期列（含自定义「生效期」）：列表展示 MM-DD */
const SEA_EFF_CUSTOM_FIELDS = new Set([
  'cf_sea_bunker_eff',
  'cf_sea_freight_eff',
  'cf_sea_others_eff',
  'cf_seaBunkerEff',
  'cf_seaFreightEff',
  'cf_seaOthersEff',
]);

function isSeaTableDateField(
  field: string,
  options?: { dataType?: string; title?: string },
) {
  if (options?.dataType === 'date') return true;
  if (field.endsWith('ValidDate')) return true;
  if (SEA_EFF_CUSTOM_FIELDS.has(field)) return true;
  if (options?.title === '生效期' || options?.title === '有效期') return true;
  if (field.startsWith('cf_') && /(_eff|Eff)$/.test(field)) return true;
  return false;
}

function buildFormatter(entry: FieldCatalogEntry) {
  const unitField = resolveRoadFeeUnitField(entry.field);
  if (entry.format === 'amount') {
    return ({
      cellValue,
      row,
    }: {
      cellValue: unknown;
      row: { extraFields?: Record<string, unknown> };
    }) => {
      const amount = coerceAmountValue(cellValue);
      if (amount === null) {
        return formatAmount(undefined);
      }
      return formatAmountWithUnit(
        formatAmount(amount),
        readRowUnit(row, unitField),
      );
    };
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
  if (entry.format === 'dateMd') {
    return ({ cellValue }: { cellValue: null | number | string }) =>
      formatDateMd(cellValue);
  }
  return undefined;
}

function buildCatalogMap(mode: CostMode, layout: CostTableTemplateLayout) {
  const map = toFieldCatalogMap(getFieldCatalog(mode));
  layout.customFields?.forEach((def) => {
    const title = def.title;
    map.set(def.field, {
      field: def.field,
      format:
        def.dataType === 'number'
          ? 'amount'
          : mode === 'sea' &&
              isSeaTableDateField(def.field, {
                dataType: def.dataType,
                title,
              })
            ? 'dateMd'
            : undefined,
      labelKey: title,
    });
  });
  resolveLayoutFieldOrder(mode, layout).forEach((field) => {
    const title = resolveFieldTitle(mode, field, layout);
    if (isCustomFieldKey(field)) {
      const existing = map.get(field);
      if (existing) {
        if (
          mode === 'sea' &&
          !existing.format &&
          isSeaTableDateField(field, { title })
        ) {
          map.set(field, { ...existing, format: 'dateMd' });
        }
        return;
      }
      map.set(field, {
        field,
        format:
          mode === 'sea' && isSeaTableDateField(field, { title })
            ? 'dateMd'
            : undefined,
        labelKey: title,
      });
      return;
    }
    const catalog = map.get(field);
    if (
      mode === 'sea' &&
      catalog &&
      !catalog.format &&
      isSeaTableDateField(field, { title })
    ) {
      map.set(field, { ...catalog, format: 'dateMd' });
    }
  });
  return map;
}

function buildRequiredHeaderSlot(title: string) {
  return () =>
    h('span', { class: 'col-required-header' }, [
      h('span', { class: 'col-required-mark' }, '*'),
      h('span', null, title),
    ]);
}

function buildLeafColumn(
  entry: FieldCatalogEntry,
  options: {
    mode: CostMode;
    override?: CostTableFieldOverride;
    required?: boolean;
    title: string;
  },
) {
  const size = resolveCompactColumnSize(options.title, entry, {
    required: options.required,
  });
  const headerClassName = [
    entry.headerClassName,
    options.required ? 'col-required' : undefined,
  ]
    .filter(Boolean)
    .join(' ');
  const minWidth =
    options.override?.minWidth ?? entry.minWidth ?? size.minWidth;
  const width = options.override?.width ?? entry.width;
  const column: Record<string, unknown> = {
    align: entry.align,
    field: entry.field,
    headerClassName: headerClassName || undefined,
    minWidth,
    showOverflow: entry.showOverflow ?? true,
    sortable: options.override?.sortable === true,
    title: options.title,
  };
  if (typeof width === 'number' && width > 0) {
    column.width = width;
  }

  if (options.required) {
    column.slots = {
      header: buildRequiredHeaderSlot(options.title),
    };
  }

  if (entry.align) column.align = entry.align;
  if (entry.className) column.className = entry.className;
  if (options.override?.fixed) column.fixed = options.override.fixed;
  applyColumnBgParams(
    column,
    resolveColumnBgColor(options.mode, entry.field, options.override?.bgColor),
  );

  if (isCustomFieldKey(entry.field)) {
    column.field = customFieldColumnPath(entry.field);
    column.showOverflow = entry.showOverflow ?? true;
    if (options.override?.sortable === true) {
      column.sortBy = ({
        row,
      }: {
        row: { extraFields?: Record<string, unknown> };
      }) => {
        const raw = row.extraFields?.[entry.field];
        if (raw === null || raw === undefined || raw === '') {
          return null;
        }
        if (entry.format === 'amount') {
          const amount = coerceAmountValue(raw);
          return amount;
        }
        const asNum = coerceAmountValue(raw);
        return asNum === null ? String(raw) : asNum;
      };
    }
    const useDateMd =
      entry.format === 'dateMd' ||
      (options.mode === 'sea' &&
        isSeaTableDateField(entry.field, { title: options.title }));
    const unitField = resolveRoadFeeUnitField(entry.field);
    column.formatter = ({
      cellValue,
      row,
    }: {
      cellValue: unknown;
      row: { extraFields?: Record<string, unknown> };
    }) => {
      let value: unknown = cellValue;
      if (
        value === undefined ||
        value === null ||
        (typeof value === 'object' && !Array.isArray(value))
      ) {
        value = row.extraFields?.[entry.field];
      }
      if (value === undefined || value === null || value === '') {
        return '';
      }
      if (entry.format === 'amount') {
        const amount = coerceAmountValue(value);
        if (amount === null) {
          return String(value);
        }
        return formatAmountWithUnit(
          formatAmount(amount),
          readRowUnit(row, unitField),
        );
      }
      // 即使未标 amount，只要挂了单位字段也拼接（兜底）
      if (unitField) {
        const amount = coerceAmountValue(value);
        if (amount !== null) {
          return formatAmountWithUnit(
            formatAmount(amount),
            readRowUnit(row, unitField),
          );
        }
      }
      if (useDateMd) {
        return formatDateMd(
          typeof value === 'string' || typeof value === 'number'
            ? value
            : String(value),
        );
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
  return (
    resolveLayoutFieldOrder(mode, layout)
      .filter((field) => isFieldVisibleInLayout(layout, field))
      // 单位列仅导入/导出与表单使用；列表拼到对应费用后
      .filter((field) => !(mode === 'road' && isRoadFeeUnitField(field)))
      .map((field) => {
        const entry = catalogMap.get(field);
        if (!entry) return null;
        return buildLeafColumn(entry, {
          mode,
          override: layout.fieldOverrides?.[field],
          required: isFieldRequiredInLayout(layout, field),
          title: resolveFieldTitle(mode, field, layout),
        });
      })
      .filter(Boolean)
  );
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
    if (mode === 'road' && isRoadFeeUnitField(field)) {
      index += 1;
      continue;
    }
    const group = fieldToGroup.get(field);
    if (!group) {
      const entry = catalogMap.get(field);
      if (entry) {
        columns.push(
          buildLeafColumn(entry, {
            mode,
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
      if (mode === 'road' && isRoadFeeUnitField(groupedField)) {
        index += 1;
        continue;
      }
      const entry = catalogMap.get(groupedField);
      if (entry) {
        children.push(
          buildLeafColumn(entry, {
            mode,
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
    enableRenew = false,
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

  const catalogMap = buildCatalogMap(
    mode,
    mode === 'road'
      ? ensureRoadFeeUnitFields(template.layout)
      : template.layout,
  );
  const dataColumns = buildLayoutColumns(
    mode,
    mode === 'road'
      ? ensureRoadFeeUnitFields(template.layout)
      : template.layout,
    catalogMap,
    {
      flattenGroups: mode === 'road',
    },
  );

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
    { enableRenew: enableRenew || mode === 'road' },
  );
}
