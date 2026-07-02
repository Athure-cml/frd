import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import { $t } from '#/locales';

import { statusTagOptions } from './tags';

const t = (key: string) => $t(`page.system.${key}`);

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

export function buildOperationColumn<T>(
  canManage: boolean,
  onActionClick: (params: { code: string; row: T }) => void,
  options: {
    nameField: string;
    nameTitle: string;
    operationOptions?: Array<Record<string, any> | string>;
  },
): NonNullable<VxeTableGridOptions<T>['columns']>[number] | null {
  if (!canManage) {
    return null;
  }
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
    title: t('fields.operation'),
    width: 140,
  };
}
