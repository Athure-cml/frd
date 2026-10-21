import type { FieldCatalogEntry } from './field-catalog';

/** 排序三角图标约占宽度 */
const HEADER_SORT_ICON_WIDTH = 16;
/** 筛选图标约占宽度 */
const HEADER_FILTER_ICON_WIDTH = 14;

/** 按表头文案估算列宽下限（单行、完整标题 + 图标），单位 px */
export function estimateHeaderTextWidth(
  title: string,
  required = false,
  extras?: { filterable?: boolean; sortable?: boolean },
): number {
  // * 号 + 间距
  let width = required ? 14 : 0;
  // 单元格左右 padding + 边框/拖拽把手余量
  width += 32;
  for (const ch of title) {
    const code = ch.codePointAt(0) ?? 0;
    if (code > 0x7f) {
      // 中日韩等全角字，按表头字号略放宽，避免差 1px 换行
      width += 14;
    } else if (ch === ' ') {
      width += 4;
    } else if ('%/()-&'.includes(ch)) {
      width += 8;
    } else {
      // 英文/数字
      width += 8;
    }
  }
  if (extras?.sortable) {
    width += HEADER_SORT_ICON_WIDTH;
  }
  if (extras?.filterable) {
    width += HEADER_FILTER_ICON_WIDTH;
  }
  return Math.ceil(width);
}

/**
 * 列宽贴合表头：只返回 minWidth，不写死 width（与卡车成本库一致）。
 * 海运等需要固定宽的模式，在字段目录里显式写 width。
 */
export function resolveCompactColumnSize(
  title: string,
  entry: Pick<FieldCatalogEntry, 'format' | 'minWidth'>,
  options?: {
    filterable?: boolean;
    required?: boolean;
    sortable?: boolean;
  },
): { minWidth: number } {
  const headerWidth = estimateHeaderTextWidth(title, options?.required, {
    filterable: options?.filterable,
    sortable: options?.sortable,
  });
  const amountFloor =
    entry.format === 'amount' ||
    entry.format === 'percent' ||
    entry.format === 'price'
      ? 64
      : 0;
  if (typeof entry.minWidth === 'number' && entry.minWidth > 0) {
    return { minWidth: entry.minWidth };
  }

  return { minWidth: Math.max(headerWidth, amountFloor) };
}
