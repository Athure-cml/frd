import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import { $t } from '#/locales';

import { statusTagOptions } from './tags';

const t = (key: string) => $t(`page.system.${key}`);

/** 列表勾选列（导出选中 / 批量操作） */
export function buildCheckboxColumn() {
  return {
    fixed: 'left' as const,
    type: 'checkbox' as const,
    width: 48,
  };
}

/** 列表序号列（按当前页分页递增） */
export function buildSeqColumn(width = 60) {
  return {
    align: 'center' as const,
    fixed: 'left' as const,
    title: '序号',
    type: 'seq' as const,
    width,
  };
}

export function buildStatusColumn<T>(
  canManage: boolean,
  onStatusChange?: (newStatus: number, row: T) => Promise<boolean | undefined>,
  field = 'status',
  extraCellRender?: {
    attrs?: Record<string, any>;
    props?: Record<string, any>;
  },
) {
  return {
    align: 'center' as const,
    cellRender: {
      attrs: { beforeChange: onStatusChange, ...extraCellRender?.attrs },
      name: canManage && onStatusChange ? 'CellSwitch' : 'CellTag',
      options: statusTagOptions(),
      props: extraCellRender?.props,
    },
    field,
    title: t('fields.status'),
    width: 108,
  };
}

export function appendPinOperationOptions(
  operationOptions: Array<Record<string, any> | string>,
  labels: { pin: string; unpin: string },
) {
  operationOptions.push(
    {
      code: 'pin',
      show: (row: { pinnedAt?: null | string }) => !row.pinnedAt,
      text: labels.pin,
    },
    {
      code: 'unpin',
      show: (row: { pinnedAt?: null | string }) => !!row.pinnedAt,
      text: labels.unpin,
    },
  );
}

export function buildOperationColumn<T>(
  canManage: boolean,
  onActionClick: (params: { code: string; row: T }) => void,
  options: {
    minWidth?: number;
    nameField: string;
    nameTitle: string;
    operationOptions?: Array<Record<string, any> | string>;
    width?: number;
  },
): NonNullable<VxeTableGridOptions<T>['columns']>[number] | null {
  if (!canManage) {
    return null;
  }
  const width = options.width ?? 168;
  const minWidth = options.minWidth ?? width;
  return {
    align: 'center',
    cellRender: {
      attrs: {
        nameField: options.nameField,
        nameTitle: options.nameTitle,
        onClick: onActionClick,
      },
      name: 'CellOperation',
      options: options.operationOptions ?? ['edit', 'delete'],
    },
    field: 'operation',
    fixed: 'right',
    minWidth,
    showOverflow: false,
    title: t('fields.operation'),
    width,
  };
}
