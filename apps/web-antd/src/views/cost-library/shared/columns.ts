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

/** 状态标签「生效中 / 已过期」内容宽度 */
const COST_STATUS_COL_WIDTH = 76;
/** 操作「修改 / 复制 / 删除」 */
const COST_OPERATION_COL_WIDTH_DEFAULT = 148;
/** 操作「修改 / 续期 / 复制 / 删除」 */
const COST_OPERATION_COL_WIDTH_WITH_RENEW = 188;

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
      'edit',
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
      'delete',
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
