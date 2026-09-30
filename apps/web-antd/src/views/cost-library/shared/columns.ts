import type { OnActionClickFn, VxeTableGridOptions } from '#/adapter/vxe-table';

import { preferences } from '@vben/preferences';

import { $t } from '#/locales';

import { buildOperationColumn } from '../../system/shared/columns';
import { costStatusTagOptions } from './tags';

function isMobileViewport() {
  return !!preferences.app.isMobile;
}

export function buildCostCheckboxColumn() {
  return {
    ...(isMobileViewport() ? {} : { fixed: 'left' as const }),
    type: 'checkbox' as const,
    width: 48,
  };
}

/** 状态标签「未生效 / 生效中 / 已过期」内容宽度 */
const COST_STATUS_COL_WIDTH = 76;
/** 关联数据：Tag + 查看 */
export const COST_RELATION_COL_WIDTH = 120;
export const QUOTE_RELATION_COL_WIDTH = 96;
/** 操作「修改 / 复制 / 删除」 */
const COST_OPERATION_COL_WIDTH_DEFAULT = 148;
/** 报价库操作「修改 / 删除」 */
const QUOTE_LIBRARY_OPERATION_COL_WIDTH = 108;
/** 操作「修改 / 续期 / 复制 / 删除」 */
const COST_OPERATION_COL_WIDTH_WITH_RENEW = 188;

type RelationLinkRow = { id: number; inQuoteLibrary?: boolean };

export function buildCostRelationColumn<T extends RelationLinkRow>(options: {
  direction: 'cost-to-quote' | 'quote-to-cost';
  onNavigate: (row: T) => void;
}) {
  const width =
    options.direction === 'quote-to-cost'
      ? QUOTE_RELATION_COL_WIDTH
      : COST_RELATION_COL_WIDTH;
  return {
    align: 'center' as const,
    cellRender: {
      attrs: {
        direction: options.direction,
        onClick: options.onNavigate,
      },
      name: 'CellRelationLink',
    },
    field: 'relationLink',
    ...(isMobileViewport() ? {} : { fixed: 'right' as const }),
    minWidth: width,
    showOverflow: false,
    title: $t('page.costLibrary.fields.relationData'),
    width,
  };
}

export function buildCostStatusColumn() {
  return {
    align: 'center' as const,
    cellRender: {
      name: 'CellTag',
      options: costStatusTagOptions(),
    },
    field: 'status',
    ...(isMobileViewport() ? {} : { fixed: 'right' as const }),
    minWidth: COST_STATUS_COL_WIDTH,
    title: $t('page.costLibrary.fields.status'),
    width: COST_STATUS_COL_WIDTH,
  };
}

export function appendCostStatusColumn<T>(
  columns: VxeTableGridOptions<T>['columns'],
) {
  columns?.push(buildCostStatusColumn());
  return columns;
}

type QuoteLibraryLockableRow = { inQuoteLibrary?: boolean };

type QuoteOrderLockedRow = { quoteOrderLocked?: boolean };

function disableWhenQuoteOrderLocked(row: QuoteOrderLockedRow) {
  return row.quoteOrderLocked === true;
}

/** 成本库：成交报价单已引用 → 禁改删；仅入报价库 → 仍禁删 */
function disableCostEditWhenWonLocked(row: QuoteOrderLockedRow) {
  return row.quoteOrderLocked === true;
}

function disableCostDeleteWhenLocked(
  row: QuoteLibraryLockableRow & QuoteOrderLockedRow,
) {
  return row.quoteOrderLocked === true || row.inQuoteLibrary === true;
}

/** 报价库列表操作列：禁用已被报价单引用的行，删除确认由页面 Modal 处理 */
export function appendQuoteLibraryOperationColumn<T extends { id: number }>(
  columns: VxeTableGridOptions<T>['columns'],
  canEdit: boolean,
  onActionClick: OnActionClickFn<T>,
) {
  const mobile = isMobileViewport();
  const operation = buildOperationColumn(canEdit, onActionClick, {
    minWidth: QUOTE_LIBRARY_OPERATION_COL_WIDTH,
    nameField: 'id',
    nameTitle: $t('page.quote.library.deleteNameTitle'),
    operationOptions: [
      {
        code: 'edit',
        disabled: disableWhenQuoteOrderLocked,
      },
      {
        code: 'delete',
        confirm: false,
        disabled: disableWhenQuoteOrderLocked,
      },
    ],
    width: QUOTE_LIBRARY_OPERATION_COL_WIDTH,
  });
  if (operation) {
    operation.title = $t('page.costLibrary.fields.operation');
    operation.minWidth = QUOTE_LIBRARY_OPERATION_COL_WIDTH;
    operation.width = QUOTE_LIBRARY_OPERATION_COL_WIDTH;
    if (mobile) {
      delete (operation as { fixed?: string }).fixed;
    }
    columns?.push(operation);
  }
  return columns;
}

export function appendCostOperationColumn<T extends { id: number }>(
  columns: VxeTableGridOptions<T>['columns'],
  canEdit: boolean,
  onActionClick: OnActionClickFn<T>,
  nameField: string,
  nameTitle: string,
  options?: { enableRenew?: boolean },
) {
  const mobile = isMobileViewport();
  const enableRenew = options?.enableRenew === true;
  const operationWidth = enableRenew
    ? COST_OPERATION_COL_WIDTH_WITH_RENEW
    : COST_OPERATION_COL_WIDTH_DEFAULT;
  const operation = buildOperationColumn(canEdit, onActionClick, {
    nameField,
    nameTitle,
    operationOptions: [
      {
        code: 'edit',
        disabled: disableCostEditWhenWonLocked,
      },
      ...(enableRenew
        ? [
            {
              code: 'renew',
              text: $t('page.costLibrary.actions.renew'),
            },
          ]
        : []),
      {
        code: 'copy',
        text: $t('page.costLibrary.actions.copy'),
      },
      {
        code: 'delete',
        disabled: disableCostDeleteWhenLocked,
      },
    ],
  });
  if (operation) {
    operation.title = $t('page.costLibrary.fields.operation');
    operation.minWidth = operationWidth;
    operation.width = operationWidth;
    if (mobile) {
      // 小屏取消右固定，避免操作列占满屏宽挡住数据列；改为整表横滑
      delete (operation as { fixed?: string }).fixed;
    }
    columns?.push(operation);
  }
  return columns;
}

/**
 * 小屏统一去掉左右固定列（含模板自定义 fixed），桌面原样返回。
 * 这是管理后台宽表在移动端的常见处理：整表横向滚动，而不是钉死操作列。
 */
export function adaptCostColumnsForViewport<T>(
  columns: VxeTableGridOptions<T>['columns'],
): VxeTableGridOptions<T>['columns'] {
  if (!columns || !isMobileViewport()) {
    return columns;
  }

  const strip = (
    col: NonNullable<VxeTableGridOptions<T>['columns']>[number],
  ): NonNullable<VxeTableGridOptions<T>['columns']>[number] => {
    if (!col || typeof col !== 'object') {
      return col;
    }
    const next = { ...col } as Record<string, unknown>;
    if ('fixed' in next) {
      delete next.fixed;
    }
    if (Array.isArray(next.children)) {
      next.children = (
        next.children as NonNullable<VxeTableGridOptions<T>['columns']>
      )
        .filter(Boolean)
        .map((child) => strip(child));
    }
    if (next.field === 'operation') {
      next.width = COST_OPERATION_COL_WIDTH_WITH_RENEW;
      next.minWidth = COST_OPERATION_COL_WIDTH_WITH_RENEW;
    }
    if (next.field === 'relationLink') {
      next.width = COST_RELATION_COL_WIDTH;
      next.minWidth = COST_RELATION_COL_WIDTH;
    }
    if (next.field === 'status') {
      next.width = COST_STATUS_COL_WIDTH;
      next.minWidth = COST_STATUS_COL_WIDTH;
    }
    if (next.type === 'seq') {
      next.width = 44;
    }
    return next as NonNullable<VxeTableGridOptions<T>['columns']>[number];
  };

  return columns.filter(Boolean).map((col) => strip(col));
}

export function costOperationTitle() {
  return $t('page.costLibrary.fields.operation');
}

export function injectRelationColumn<T extends { id: number }>(
  columns: VxeTableGridOptions<T>['columns'],
  options: {
    direction: 'cost-to-quote' | 'quote-to-cost';
    onNavigate: (row: T) => void;
  },
): VxeTableGridOptions<T>['columns'] {
  if (!columns?.length) {
    return columns;
  }
  const statusIndex = columns.findIndex(
    (column) =>
      column &&
      typeof column === 'object' &&
      'field' in column &&
      column.field === 'status',
  );
  const relationColumn = buildCostRelationColumn(options);
  if (statusIndex === -1) {
    return [...columns, relationColumn];
  }
  return [
    ...columns.slice(0, statusIndex),
    relationColumn,
    ...columns.slice(statusIndex),
  ] as VxeTableGridOptions<T>['columns'];
}
