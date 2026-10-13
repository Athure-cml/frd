import type { VxeTableGridOptions } from '#/adapter/vxe-table';
import type { CostMode } from '#/api/cost';
import type { QuoteCostType } from '#/api/quote';

import { appendCostStatusColumn } from '../../cost-library/shared/columns';
import { buildQuoteLibrarySnapshotColumns } from '../library/shared/quote-library-columns';

export const QUOTE_COST_TYPE_TO_MODE: Record<QuoteCostType, CostMode> = {
  ROAD: 'road',
  SEA: 'sea',
  FUMIGATION: 'fumigation',
};

export function quoteCostTypeToMode(type: QuoteCostType): CostMode {
  return QUOTE_COST_TYPE_TO_MODE[type];
}

type PickerColumn = NonNullable<VxeTableGridOptions['columns']>[number];

/** 卡车报价库：SUPPLIER 固定右侧（引入弹窗 / 数据来源快照共用） */
function fixRoadSupplierColumn(columns: PickerColumn[]) {
  for (const column of columns) {
    if (column?.field === 'supplier') {
      const width = Number(column.width ?? column.minWidth ?? 140) || 140;
      column.fixed = 'right';
      column.width = width;
      column.minWidth = width;
      return;
    }
  }
}

/**
 * 列宽按容器自适应：
 * - 普通列只保留 minWidth，列总宽不足时 VXE 拉伸填满，避免右侧留白
 * - 勾选/序号/状态等功能列保留固定 width
 * - 列总宽超出容器时仍出现横向滚动
 */
function ensureSnapshotColumnWidths(columns: PickerColumn[]) {
  for (const column of columns) {
    if (!column || typeof column !== 'object') {
      continue;
    }
    const children = column.children as PickerColumn[] | undefined;
    if (children?.length) {
      ensureSnapshotColumnWidths(children);
      continue;
    }
    const size = Number(column.width ?? column.minWidth ?? 100) || 100;
    const keepFixedWidth =
      column.type === 'checkbox' ||
      column.type === 'radio' ||
      column.type === 'seq' ||
      column.field === 'status' ||
      column.fixed === 'left' ||
      column.fixed === 'right';
    if (keepFixedWidth) {
      column.width = size;
      column.minWidth = size;
      continue;
    }
    column.minWidth = size;
    delete (column as { width?: number }).width;
  }
}

export function buildQuoteCostPickerColumns(
  mode: CostMode,
  options?: { multiSelect?: boolean },
): VxeTableGridOptions['columns'] {
  const columns: PickerColumn[] = [
    {
      fixed: 'left',
      type: options?.multiSelect ? 'checkbox' : 'radio',
      width: 48,
    },
    ...(buildCostSnapshotColumns(mode) ?? []),
  ];
  // 状态列固定右侧、置于最右（卡车 SUPPLIER 已在快照列中固定右侧）
  appendCostStatusColumn(columns);
  return columns;
}

/** 与报价库列表一致的数据列（含 # 序号，无勾选/操作列） */
export function buildCostSnapshotColumns(
  mode: CostMode,
): VxeTableGridOptions['columns'] {
  const columns: PickerColumn[] = [
    ...(buildQuoteLibrarySnapshotColumns(mode) ?? []),
  ];
  ensureSnapshotColumnWidths(columns);
  if (mode === 'road') {
    fixRoadSupplierColumn(columns);
  }
  return columns;
}
