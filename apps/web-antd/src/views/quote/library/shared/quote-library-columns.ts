import type { QuoteLibraryMode, QuoteLibraryRow } from './quote-library-row';

import type { OnActionClickFn, VxeTableGridOptions } from '#/adapter/vxe-table';
import type { CostTableTemplate } from '#/api/cost';

import { $t } from '#/locales';

import { formatAmount } from '../../../cost-library/road/formatters';
import { buildFumigationColumnsFromLayout } from '../../../cost-library/shared/build-fumigation-columns';
import {
  applyColumnBgParams,
  DEFAULT_TOTAL_COLUMN_BG,
  resolveColumnBgColor,
} from '../../../cost-library/shared/column-bg-style';
import { buildColumnSortBy } from '../../../cost-library/shared/column-sort';
import {
  appendCostStatusColumn,
  appendQuoteLibraryOperationColumn,
  buildCostCheckboxColumn,
} from '../../../cost-library/shared/columns';
import { getDefaultTemplate } from '../../../cost-library/shared/default-templates';
import {
  getFieldCatalog,
  toFieldCatalogMap,
} from '../../../cost-library/shared/field-catalog';
import { ROAD_REMARK_FIELD } from '../../../cost-library/shared/field-catalog/road';
import { formatDateYmd } from '../../../cost-library/shared/formatters';
import {
  customFieldColumnPath,
  isCustomFieldKey,
} from '../../../cost-library/shared/template-field-model';
import { buildQuoteRuleHeaderSlot } from '../../shared/quote-rule-header';

export type { QuoteLibraryMode };

/** 列布局版本：变更默认表头时递增，使本地列配置按新版本独立存储 */
export const QUOTE_LIBRARY_GRID_LAYOUT_VERSION = '20250928-date-cols';

export interface QuoteLibraryColumnDef {
  bgColor?: string;
  field: string;
  format?: 'amount' | 'dateMd';
  title: string;
  width?: number;
}

const roadT = (key: string) => $t(`page.costLibrary.roadFields.${key}`);
const seaT = (key: string) => $t(`page.costLibrary.seaFields.${key}`);

const ROAD_EFFECTIVE_FIELD = 'cf_road_eff';
const SEA_FREIGHT_EFF_FIELD = 'cf_sea_freight_eff';

const QUOTE_LIBRARY_SEQ_COLUMN = {
  fixed: 'left' as const,
  title: '#',
  type: 'seq' as const,
  width: 56,
};

/** 卡车报价库表头（顺序与业务 Excel 一致） */
export const QUOTE_LIBRARY_ROAD_COLUMNS: QuoteLibraryColumnDef[] = [
  { field: 'zipCode', title: 'ZIP CODE', width: 100 },
  { field: 'city', title: 'CITY', width: 110 },
  { field: 'logYardNameAddress', title: 'PICK UP ADDRESS', width: 180 },
  { field: 'state', title: 'STATE', width: 80 },
  { field: 'por', title: 'POR', width: 96 },
  {
    bgColor: DEFAULT_TOTAL_COLUMN_BG,
    field: 'allInNoFm',
    format: 'amount',
    title: 'ALL IN',
    width: 172,
  },
  {
    bgColor: DEFAULT_TOTAL_COLUMN_BG,
    field: 'allInFmOneWay',
    format: 'amount',
    title: 'ALL IN FM NON OAK',
    width: 172,
  },
  {
    bgColor: DEFAULT_TOTAL_COLUMN_BG,
    field: 'allInFmRound',
    format: 'amount',
    title: 'ALL IN FM OAK',
    width: 172,
  },
  {
    field: ROAD_EFFECTIVE_FIELD,
    format: 'dateMd',
    title: 'EFFECTIVE TIME',
    width: 120,
  },
  {
    field: 'validDate',
    format: 'dateMd',
    title: roadT('validDate'),
    width: 120,
  },
  { field: ROAD_REMARK_FIELD, title: 'REMARK', width: 200 },
  { field: 'nsLift', format: 'amount', title: 'NS LIFT', width: 96 },
  { field: 'chassis', format: 'amount', title: 'CHASSIS', width: 96 },
  { field: 'waitingFee', format: 'amount', title: 'WAITING', width: 96 },
  { field: 'redelivery', format: 'amount', title: 'REDELIVERY', width: 120 },
  { field: 'supplier', title: 'SUPPLIER', width: 140 },
];

/** 海运报价库表头 */
export const QUOTE_LIBRARY_SEA_COLUMNS: QuoteLibraryColumnDef[] = [
  { field: 'por', title: seaT('por'), width: 96 },
  { field: 'pol', title: seaT('pol'), width: 96 },
  { field: 'pod', title: seaT('pod'), width: 96 },
  { field: 'containerType', title: seaT('containerType'), width: 100 },
  {
    field: SEA_FREIGHT_EFF_FIELD,
    format: 'dateMd',
    title: seaT('effectiveDate'),
    width: 96,
  },
  {
    field: 'freightValidDate',
    format: 'dateMd',
    title: seaT('freightValidDate'),
    width: 96,
  },
  { field: 'allIn', format: 'amount', title: seaT('allIn'), width: 120 },
  { field: 'ssl', title: seaT('ssl'), width: 120 },
  { field: 'agent', title: seaT('agent'), width: 120 },
  { field: 'remark', title: seaT('remark'), width: 200 },
  { field: 'enProductName', title: seaT('enProductName'), width: 140 },
];

function readRowValue(row: QuoteLibraryRow, field: string): unknown {
  const record = row as unknown as Record<string, unknown>;
  if (Object.prototype.hasOwnProperty.call(record, field)) {
    return record[field];
  }
  if (isCustomFieldKey(field)) {
    const extra = record.extraFields;
    if (extra && typeof extra === 'object' && !Array.isArray(extra)) {
      return (extra as Record<string, unknown>)[field];
    }
  }
  return undefined;
}

function formatCellValue(value: unknown, col: QuoteLibraryColumnDef) {
  if (value === null || value === undefined || value === '') {
    return '—';
  }
  if (col.format === 'amount') {
    return formatAmount(typeof value === 'number' ? value : Number(value));
  }
  if (col.format === 'dateMd') {
    // 报价库时间字段统一 yyyy-MM-dd，避免只显示 MM/DD 丢年份
    const text = formatDateYmd(
      typeof value === 'string' || typeof value === 'number'
        ? value
        : String(value),
    );
    return text || '—';
  }
  return String(value);
}

function resolveColumnFieldKey(field?: string) {
  if (!field) {
    return undefined;
  }
  const prefix = 'extraFields.';
  return field.startsWith(prefix) ? field.slice(prefix.length) : field;
}

type QuoteLibraryGridColumn = NonNullable<
  VxeTableGridOptions<QuoteLibraryRow>['columns']
>[number];

function withRuleHintHeader(
  column: QuoteLibraryGridColumn,
  fieldKey: string,
  ruleHintMap: Record<string, string>,
) {
  const hint = ruleHintMap[fieldKey];
  if (!hint) {
    return column;
  }
  const title =
    typeof column.title === 'string' ? column.title : String(fieldKey);
  return {
    ...column,
    slots: {
      ...column.slots,
      header: buildQuoteRuleHeaderSlot(title, hint),
    },
  };
}

function applyRuleHintHeaders(
  columns: VxeTableGridOptions<QuoteLibraryRow>['columns'],
  ruleHintMap: Record<string, string>,
): VxeTableGridOptions<QuoteLibraryRow>['columns'] {
  if (!columns?.length || Object.keys(ruleHintMap).length === 0) {
    return columns;
  }

  return columns.map((column) => {
    if (column.children?.length) {
      return {
        ...column,
        children: applyRuleHintHeaders(column.children, ruleHintMap),
      };
    }
    const fieldKey = resolveColumnFieldKey(column.field);
    if (!fieldKey) {
      return column;
    }
    return withRuleHintHeader(column, fieldKey, ruleHintMap);
  });
}

function stripColumnBg(column: Record<string, unknown>) {
  const params = column.params as Record<string, unknown> | undefined;
  if (params) {
    delete params.bgColor;
    if (Object.keys(params).length === 0) {
      delete column.params;
    }
  }
  column.className = String(column.className ?? '')
    .replaceAll(/\bcol-tmpl-bg\b/g, '')
    .trim();
}

/** 仅同步成本库视图中的「可排序」与「列背景色」，不改报价库表头字段与顺序 */
function applyTemplateSortAndColor(
  columns: VxeTableGridOptions<QuoteLibraryRow>['columns'],
  mode: QuoteLibraryMode,
  template?: CostTableTemplate,
): VxeTableGridOptions<QuoteLibraryRow>['columns'] {
  const fieldOverrides = template?.layout?.fieldOverrides;
  if (!columns?.length || !fieldOverrides) {
    return columns;
  }

  const catalogMap = toFieldCatalogMap(getFieldCatalog(mode));

  const patchColumn = (
    column: QuoteLibraryGridColumn,
  ): QuoteLibraryGridColumn => {
    if (!column || typeof column !== 'object') {
      return column;
    }
    if (column.children?.length) {
      return {
        ...column,
        children: column.children.map((child) => patchColumn(child)),
      };
    }

    const fieldKey = resolveColumnFieldKey(column.field);
    if (!fieldKey) {
      return column;
    }

    const override = fieldOverrides[fieldKey];
    if (!override) {
      return column;
    }

    const next = { ...column } as Record<string, unknown>;

    if (override.sortable === true) {
      const entry = catalogMap.get(fieldKey);
      if (entry) {
        next.sortable = true;
        next.sortBy = buildColumnSortBy(entry, mode, {
          field: fieldKey,
          title: typeof column.title === 'string' ? column.title : fieldKey,
        });
      }
    }

    if (Reflect.has(override, 'bgColor')) {
      stripColumnBg(next);
      const bgColor = resolveColumnBgColor(mode, fieldKey, override.bgColor);
      if (bgColor) {
        applyColumnBgParams(next, bgColor);
      }
    }

    return next as QuoteLibraryGridColumn;
  };

  return columns.map((column) => patchColumn(column));
}

function buildFlatLibraryColumns(
  cols: QuoteLibraryColumnDef[],
  ruleHintMap: Record<string, string>,
) {
  return cols.map((col) => {
    const column: QuoteLibraryGridColumn = {
      field: isCustomFieldKey(col.field)
        ? customFieldColumnPath(col.field)
        : col.field,
      formatter: ({ row }: { row: QuoteLibraryRow }) =>
        formatCellValue(readRowValue(row, col.field), col),
      minWidth: col.width ?? 100,
      showOverflow: true,
      title: col.title,
    };
    if (col.bgColor) {
      applyColumnBgParams(column as Record<string, unknown>, col.bgColor);
    }
    return withRuleHintHeader(column, col.field, ruleHintMap);
  });
}

function buildLeadingColumns() {
  return [buildCostCheckboxColumn(), QUOTE_LIBRARY_SEQ_COLUMN];
}

function buildRoadOrSeaColumns(
  mode: 'road' | 'sea',
  ruleHintMap: Record<string, string>,
  onActionClick: OnActionClickFn<QuoteLibraryRow>,
  canManage: boolean,
  template?: CostTableTemplate,
): VxeTableGridOptions<QuoteLibraryRow>['columns'] {
  const dataCols = buildFlatLibraryColumns(
    mode === 'road' ? QUOTE_LIBRARY_ROAD_COLUMNS : QUOTE_LIBRARY_SEA_COLUMNS,
    ruleHintMap,
  );
  const columns: VxeTableGridOptions<QuoteLibraryRow>['columns'] = [
    ...buildLeadingColumns(),
    ...dataCols,
  ];
  appendCostStatusColumn(columns);
  if (canManage) {
    appendQuoteLibraryOperationColumn(columns, canManage, onActionClick);
  }
  return applyTemplateSortAndColor(columns, mode, template);
}

function buildFumigationColumns(
  ruleHintMap: Record<string, string>,
  onActionClick: OnActionClickFn<QuoteLibraryRow>,
  canManage: boolean,
  template?: CostTableTemplate,
): VxeTableGridOptions<QuoteLibraryRow>['columns'] {
  const layout = getDefaultTemplate('fumigation').layout;
  const columns = buildFumigationColumnsFromLayout(layout, {
    canEdit: canManage,
    formatDateValue: formatDateYmd,
    includeCheckbox: true,
    includeOperation: canManage,
    onActionClick,
    quoteLibraryOperation: true,
    showRequiredMark: false,
    stationDisplayShort: true,
  }) as VxeTableGridOptions<QuoteLibraryRow>['columns'];
  const result = applyRuleHintHeaders(columns, ruleHintMap);
  return applyTemplateSortAndColor(result, 'fumigation', template);
}

export function quoteLibraryGridId(mode: QuoteLibraryMode) {
  return `quote-library-${mode}-${QUOTE_LIBRARY_GRID_LAYOUT_VERSION}`;
}

const SNAPSHOT_SKIP_FIELDS = new Set(['operation', 'relationLink', 'status']);
const SNAPSHOT_SKIP_TYPES = new Set(['checkbox', 'radio']);

/** 报价单「数据来源」快照区：与报价库列表同表头，无勾选/操作/关联列 */
function stripSnapshotGridColumns(
  columns: VxeTableGridOptions<QuoteLibraryRow>['columns'],
): VxeTableGridOptions<QuoteLibraryRow>['columns'] {
  if (!columns?.length) {
    return columns;
  }
  return columns
    .map((column) => {
      if (column.children?.length) {
        const children = stripSnapshotGridColumns(column.children);
        if (!children?.length) {
          return null;
        }
        return { ...column, children };
      }
      if (column.type && SNAPSHOT_SKIP_TYPES.has(String(column.type))) {
        return null;
      }
      if (column.field && SNAPSHOT_SKIP_FIELDS.has(String(column.field))) {
        return null;
      }
      return column;
    })
    .filter(Boolean) as VxeTableGridOptions<QuoteLibraryRow>['columns'];
}

export function buildQuoteLibrarySnapshotColumns(
  mode: QuoteLibraryMode,
  template: CostTableTemplate = getDefaultTemplate(mode),
): VxeTableGridOptions<QuoteLibraryRow>['columns'] {
  if (mode === 'fumigation') {
    const columns = buildFumigationColumnsFromLayout(template.layout, {
      canEdit: false,
      formatDateValue: formatDateYmd,
      includeCheckbox: false,
      includeOperation: false,
      onActionClick: () => {},
      showRequiredMark: false,
      stationDisplayShort: true,
    }) as VxeTableGridOptions<QuoteLibraryRow>['columns'];
    const dataCols = stripSnapshotGridColumns(columns);
    return applyTemplateSortAndColor(dataCols, mode, template);
  }

  const dataCols = buildFlatLibraryColumns(
    mode === 'road' ? QUOTE_LIBRARY_ROAD_COLUMNS : QUOTE_LIBRARY_SEA_COLUMNS,
    {},
  );
  return applyTemplateSortAndColor(
    [{ fixed: 'left', title: '#', type: 'seq', width: 56 }, ...dataCols],
    mode,
    template,
  );
}

export function useQuoteLibraryColumns(
  mode: QuoteLibraryMode,
  ruleHintMap: Record<string, string> = {},
  onActionClick: OnActionClickFn<QuoteLibraryRow> = () => {},
  canManage = false,
  template?: CostTableTemplate,
): VxeTableGridOptions<QuoteLibraryRow>['columns'] {
  if (mode === 'fumigation') {
    return buildFumigationColumns(
      ruleHintMap,
      onActionClick,
      canManage,
      template,
    );
  }
  return buildRoadOrSeaColumns(
    mode,
    ruleHintMap,
    onActionClick,
    canManage,
    template,
  );
}
