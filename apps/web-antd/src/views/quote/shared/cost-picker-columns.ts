import type { VxeTableGridOptions } from '#/adapter/vxe-table';
import type { CostMode, CostTableTemplate } from '#/api/cost';
import type { QuoteCostType } from '#/api/quote';

import {
  appendCostStatusColumn,
  applyQuoteLibraryStatusColumn,
} from '../../cost-library/shared/columns';
import { getDefaultTemplate } from '../../cost-library/shared/default-templates';
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

function cloneColumns(columns: PickerColumn[]): PickerColumn[] {
  return columns.map((column) => {
    const next = { ...column } as PickerColumn;
    const children = column.children as PickerColumn[] | undefined;
    if (children?.length) {
      (next as { children: PickerColumn[] }).children = cloneColumns(children);
    }
    return next;
  });
}

function walkLeafColumns(
  columns: PickerColumn[],
  visit: (column: PickerColumn) => void,
) {
  for (const column of columns) {
    if (!column || typeof column !== 'object') {
      continue;
    }
    const children = column.children as PickerColumn[] | undefined;
    if (children?.length) {
      walkLeafColumns(children, visit);
      continue;
    }
    visit(column);
  }
}

function isFixedSizeColumn(column: PickerColumn) {
  return (
    column.type === 'checkbox' ||
    column.type === 'radio' ||
    column.type === 'seq' ||
    column.field === 'status' ||
    column.fixed === 'left' ||
    column.fixed === 'right'
  );
}

/** 卡车：SUPPLIER 固定右侧 */
function fixRoadSupplierColumn(columns: PickerColumn[]) {
  walkLeafColumns(columns, (column) => {
    if (column?.field === 'supplier') {
      const width = Number(column.width ?? column.minWidth ?? 140) || 140;
      column.fixed = 'right';
      column.width = width;
      column.minWidth = width;
    }
  });
}

/**
 * 列宽策略（已踩坑多次，勿再改回「死用接口 width」）：
 * 1) 接口/模板 width 只当 minWidth 下限
 * 2) 传入 Tab 容器宽后：列总宽不足则把余量分给可伸缩列 → 铺满 Tab
 * 3) 列总宽超出容器：保持下限，fit:false + scrollX 出横滚
 */
function ensureSnapshotColumnWidths(
  columns: PickerColumn[],
  containerWidth = 0,
) {
  walkLeafColumns(columns, (column) => {
    const size = Number(column.width ?? column.minWidth ?? 100) || 100;
    column.minWidth = size;
    column.width = size;
  });

  if (containerWidth <= 0) {
    return;
  }

  const leaves: PickerColumn[] = [];
  walkLeafColumns(columns, (column) => leaves.push(column));
  const total = leaves.reduce(
    (sum, column) => sum + (Number(column.minWidth) || 100),
    0,
  );
  const extra = Math.floor(containerWidth - total);
  if (extra <= 0 || leaves.length === 0) {
    return;
  }

  const flexible = leaves.filter((column) => !isFixedSizeColumn(column));
  const targets = flexible.length > 0 ? flexible : leaves;
  const base = Math.floor(extra / targets.length);
  let remain = extra - base * targets.length;
  for (const column of targets) {
    const bump = base + (remain > 0 ? 1 : 0);
    if (remain > 0) {
      remain -= 1;
    }
    const next = (Number(column.minWidth) || 100) + bump;
    column.width = next;
    column.minWidth = next;
  }
}

export function buildQuoteCostPickerColumns(
  mode: CostMode,
  options: {
    containerWidth?: number;
    multiSelect?: boolean;
    /** 报价库当前应用模板（必须；不用内置默认，避免与报价库闪成两套） */
    template: CostTableTemplate;
  },
): VxeTableGridOptions['columns'] {
  const { template } = options;
  const columns: PickerColumn[] = [
    {
      fixed: 'left',
      type: options.multiSelect ? 'checkbox' : 'radio',
      width: 48,
    },
    // 先不按容器铺：勾选/状态列加完后再统一 stretch，才能铺满弹窗
    ...(buildCostSnapshotColumns(mode, 0, { template }) ?? []),
  ];
  if (mode === 'road') {
    fixRoadSupplierColumn(columns);
  }
  appendCostStatusColumn(columns);
  applyQuoteLibraryStatusColumn(columns);
  ensureSnapshotColumnWidths(columns, options.containerWidth ?? 0);
  return columns;
}

/**
 * @param containerWidth Tab/宿主可视宽度。必须传入，否则无法铺满。
 * @param options.fumigationLegacy 历史熏蒸快照用旧二级表头
 * @param options.template 报价库视图模板（排序/颜色/列宽）
 */
export function buildCostSnapshotColumns(
  mode: CostMode,
  containerWidth = 0,
  options?: { fumigationLegacy?: boolean; template?: CostTableTemplate },
): VxeTableGridOptions['columns'] {
  const template = options?.template ?? getDefaultTemplate(mode);
  const columns = cloneColumns([
    ...(buildQuoteLibrarySnapshotColumns(mode, template, {
      fumigationLegacy: options?.fumigationLegacy,
    }) ?? []),
  ]);
  if (mode === 'road') {
    fixRoadSupplierColumn(columns);
  }
  ensureSnapshotColumnWidths(columns, containerWidth);
  return columns;
}
