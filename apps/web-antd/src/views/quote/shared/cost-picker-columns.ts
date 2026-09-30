import type { VxeTableGridOptions } from '#/adapter/vxe-table';
import type { CostMode } from '#/api/cost';
import type { QuoteCostType } from '#/api/quote';

import { buildQuoteLibrarySnapshotColumns } from '../library/shared/quote-library-columns';

export const QUOTE_COST_TYPE_TO_MODE: Record<QuoteCostType, CostMode> = {
  ROAD: 'road',
  SEA: 'sea',
  FUMIGATION: 'fumigation',
};

export function quoteCostTypeToMode(type: QuoteCostType): CostMode {
  return QUOTE_COST_TYPE_TO_MODE[type];
}

export function buildQuoteCostPickerColumns(
  mode: CostMode,
  options?: { multiSelect?: boolean },
): VxeTableGridOptions['columns'] {
  return [
    {
      fixed: 'left',
      type: options?.multiSelect ? 'checkbox' : 'radio',
      width: 48,
    },
    ...buildCostSnapshotColumns(mode),
  ];
}

/** 与报价库列表一致的数据列（含 # 序号，无勾选/操作列） */
export function buildCostSnapshotColumns(
  mode: CostMode,
): VxeTableGridOptions['columns'] {
  return buildQuoteLibrarySnapshotColumns(mode) ?? [];
}
