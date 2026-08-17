import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import { message } from 'ant-design-vue';

import { $t } from '#/locales';

type PinnedRow = { pinnedAt?: null | string };

/** 行拖拽把手列（需配合 rowConfig.drag） */
export function buildDragSortColumn(canDrag: boolean) {
  if (!canDrag) {
    return null;
  }
  return {
    align: 'center' as const,
    className: 'party-drag-col',
    dragSort: true,
    fixed: 'left' as const,
    headerClassName: 'party-drag-col',
    showOverflow: false,
    title: '',
    width: 36,
  };
}

export function buildPartyRowDragGridOptions(
  canDrag: boolean,
  i18nPrefix:
    | 'page.agent'
    | 'page.customer'
    | 'page.shippingLine'
    | 'page.supplier' = 'page.customer',
) {
  if (!canDrag) {
    return {
      columnConfig: { resizable: true, useKey: true },
      rowConfig: { keyField: 'id', useKey: true },
    } as Pick<
      VxeTableGridOptions,
      'columnConfig' | 'rowConfig' | 'rowDragConfig'
    >;
  }
  return {
    columnConfig: { resizable: true, useKey: true },
    rowConfig: {
      drag: true,
      keyField: 'id',
      useKey: true,
    },
    rowDragConfig: {
      dragEndMethod({
        dragRow,
        newRow,
      }: {
        dragRow?: PinnedRow;
        newRow?: PinnedRow;
      }) {
        const fromPinned = !!dragRow?.pinnedAt;
        const toPinned = !!newRow?.pinnedAt;
        if (fromPinned !== toPinned) {
          message.warning($t(`${i18nPrefix}.hint.dragCrossPin`));
          return false;
        }
        return true;
      },
    },
  } as Pick<
    VxeTableGridOptions,
    'columnConfig' | 'rowConfig' | 'rowDragConfig'
  >;
}

export function collectGridRowIds(grid: {
  getTableData?: () => {
    fullData?: Array<{ id?: number }>;
    tableData?: Array<{ id?: number }>;
  };
}): number[] {
  const data =
    grid?.getTableData?.()?.fullData ?? grid?.getTableData?.()?.tableData ?? [];
  return data
    .map((row) => row.id)
    .filter((id): id is number => typeof id === 'number');
}
