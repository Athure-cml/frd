import type { QuoteLibraryMode, QuoteLibraryRow } from './quote-library-row';

import type { OnActionClickFn, VxeTableGridOptions } from '#/adapter/vxe-table';
import type { CostTableTemplate } from '#/api/cost';

import { $t } from '#/locales';

import { buildColumnsFromTemplate } from '../../../cost-library/shared/build-columns';
import { buildFumigationColumnsFromLayout } from '../../../cost-library/shared/build-fumigation-columns';
import { DEFAULT_TOTAL_COLUMN_BG } from '../../../cost-library/shared/column-bg-style';
import {
  appendQuoteLibraryOperationColumn,
  applyQuoteLibraryStatusColumn,
} from '../../../cost-library/shared/columns';
import { getDefaultTemplate } from '../../../cost-library/shared/default-templates';
import { ROAD_REMARK_FIELD } from '../../../cost-library/shared/field-catalog/road';
import { formatDateYmd } from '../../../cost-library/shared/formatters';
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

/** 卡车报价库导出兜底表头（列表列以已应用的视图模板为准） */
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
  const required = String(column.headerClassName ?? '').includes(
    'col-required',
  );
  return {
    ...column,
    slots: {
      ...column.slots,
      header: buildQuoteRuleHeaderSlot(title, hint, required),
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

export type QuoteLibraryColumnPermissions = {
  canConfirm?: boolean;
  canDelete?: boolean;
  canEdit?: boolean;
};

function buildRoadOrSeaColumns(
  mode: 'road' | 'sea',
  ruleHintMap: Record<string, string>,
  onActionClick: OnActionClickFn<QuoteLibraryRow>,
  canManage: boolean,
  template?: CostTableTemplate,
  permissions?: QuoteLibraryColumnPermissions,
): VxeTableGridOptions<QuoteLibraryRow>['columns'] {
  const columns = buildColumnsFromTemplate<QuoteLibraryRow>({
    canEdit: canManage,
    dateStyle: 'ymd',
    includeOperation: false,
    mode,
    nameField: 'id',
    nameTitle: $t('page.quote.library.deleteNameTitle'),
    onActionClick,
    stationDisplayShort: mode === 'road',
    supplierDisplayShort: mode === 'road',
    template: template ?? getDefaultTemplate(mode),
  });
  const hinted = applyRuleHintHeaders(columns, ruleHintMap);
  applyQuoteLibraryStatusColumn(hinted);
  if (!canManage) {
    return hinted;
  }
  return appendQuoteLibraryOperationColumn(hinted, canManage, onActionClick, {
    canConfirm: permissions?.canConfirm === true,
    canDelete: permissions?.canDelete !== false,
    canEdit: permissions?.canEdit !== false,
  });
}

function buildFumigationColumns(
  ruleHintMap: Record<string, string>,
  onActionClick: OnActionClickFn<QuoteLibraryRow>,
  canManage: boolean,
  template?: CostTableTemplate,
  permissions?: QuoteLibraryColumnPermissions,
): VxeTableGridOptions<QuoteLibraryRow>['columns'] {
  const layout = (template ?? getDefaultTemplate('fumigation')).layout;
  const columns = buildFumigationColumnsFromLayout(layout, {
    canEdit: canManage,
    formatDateValue: formatDateYmd,
    includeCheckbox: true,
    includeOperation: canManage,
    onActionClick,
    quoteLibraryOperation: true,
    quoteLibraryOperationPermissions: permissions,
    stationDisplayShort: true,
  }) as VxeTableGridOptions<QuoteLibraryRow>['columns'];
  return applyRuleHintHeaders(columns, ruleHintMap);
}

const RIGHT_EDGE_FIELDS = new Set(['operation', 'relationLink', 'status']);

function readColumnFixed(
  column: QuoteLibraryGridColumn,
): 'left' | 'right' | undefined {
  const fixed = (column as { fixed?: string }).fixed;
  return fixed === 'left' || fixed === 'right' ? fixed : undefined;
}

/** 分组里左右固定不一致时拆开，否则 vxe 钉不住组内列。 */
function normalizeGroupedFixed(
  columns: VxeTableGridOptions<QuoteLibraryRow>['columns'],
): VxeTableGridOptions<QuoteLibraryRow>['columns'] {
  if (!columns?.length) {
    return columns;
  }
  const next: NonNullable<VxeTableGridOptions<QuoteLibraryRow>['columns']> = [];
  for (const column of columns) {
    const children = column.children as
      | undefined
      | VxeTableGridOptions<QuoteLibraryRow>['columns'];
    if (!children?.length) {
      next.push(column);
      continue;
    }
    const normalizedChildren = normalizeGroupedFixed(children) ?? [];
    const flags = normalizedChildren.map((child) => readColumnFixed(child));
    if (new Set(flags).size <= 1) {
      const fixed = flags[0];
      next.push(
        fixed
          ? { ...column, children: normalizedChildren, fixed }
          : { ...column, children: normalizedChildren },
      );
      continue;
    }
    let bucket: NonNullable<VxeTableGridOptions<QuoteLibraryRow>['columns']> =
      [];
    let bucketFixed: 'left' | 'right' | undefined;
    const flush = () => {
      if (bucket.length === 0) {
        return;
      }
      if (bucketFixed) {
        next.push(...bucket);
      } else {
        next.push({ ...column, children: [...bucket] });
      }
      bucket = [];
      bucketFixed = undefined;
    };
    for (const child of normalizedChildren) {
      const fixed = readColumnFixed(child);
      if (bucket.length > 0 && fixed !== bucketFixed) {
        flush();
      }
      bucketFixed = fixed;
      bucket.push(child);
    }
    flush();
  }
  return next;
}

/**
 * 勾选/序号留在最左，状态/关联/操作留在最右。
 * 模板里标了左/右固定的列贴到这两侧，避免夹在普通列中间时钉不住。
 */
export function settleQuoteLibraryFixedColumns(
  columns: VxeTableGridOptions<QuoteLibraryRow>['columns'],
): VxeTableGridOptions<QuoteLibraryRow>['columns'] {
  const normalized = normalizeGroupedFixed(columns);
  if (!normalized?.length) {
    return normalized;
  }
  const leftEdge: NonNullable<VxeTableGridOptions<QuoteLibraryRow>['columns']> =
    [];
  const rightEdge: NonNullable<
    VxeTableGridOptions<QuoteLibraryRow>['columns']
  > = [];
  const left: NonNullable<VxeTableGridOptions<QuoteLibraryRow>['columns']> = [];
  const middle: NonNullable<VxeTableGridOptions<QuoteLibraryRow>['columns']> =
    [];
  const right: NonNullable<VxeTableGridOptions<QuoteLibraryRow>['columns']> =
    [];
  for (const column of normalized) {
    if (column.type === 'checkbox' || column.type === 'seq') {
      leftEdge.push(column);
      continue;
    }
    if (column.field && RIGHT_EDGE_FIELDS.has(String(column.field))) {
      rightEdge.push(column);
      continue;
    }
    const fixed = readColumnFixed(column);
    if (fixed === 'left') {
      left.push(column);
    } else if (fixed === 'right') {
      right.push(column);
    } else {
      middle.push(column);
    }
  }
  return [...leftEdge, ...left, ...middle, ...right, ...rightEdge];
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
    return stripSnapshotGridColumns(columns);
  }

  const columns = buildColumnsFromTemplate<QuoteLibraryRow>({
    canEdit: false,
    dateStyle: 'ymd',
    includeCheckbox: false,
    includeOperation: false,
    mode,
    nameField: 'id',
    nameTitle: $t('page.quote.library.deleteNameTitle'),
    onActionClick: () => {},
    showRequiredMark: false,
    stationDisplayShort: mode === 'road',
    supplierDisplayShort: mode === 'road',
    template,
  });
  return stripSnapshotGridColumns(columns);
}

export function useQuoteLibraryColumns(
  mode: QuoteLibraryMode,
  ruleHintMap: Record<string, string> = {},
  onActionClick: OnActionClickFn<QuoteLibraryRow> = () => {},
  canManage = false,
  template?: CostTableTemplate,
  permissions?: QuoteLibraryColumnPermissions,
): VxeTableGridOptions<QuoteLibraryRow>['columns'] {
  if (mode === 'fumigation') {
    return buildFumigationColumns(
      ruleHintMap,
      onActionClick,
      canManage,
      template,
      permissions,
    );
  }
  return buildRoadOrSeaColumns(
    mode,
    ruleHintMap,
    onActionClick,
    canManage,
    template,
    permissions,
  );
}
