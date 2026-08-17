/** 视图模板列背景色：写入 column.params.bgColor，由表格 cellStyle 渲染 */

export type ColumnWithBgParams = {
  params?: {
    bgColor?: string;
  };
};

export function normalizeColumnBgColor(value?: null | string) {
  const color = value?.trim();
  if (!color) {
    return undefined;
  }
  if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(color)) {
    return color.length === 4
      ? `#${color[1]}${color[1]}${color[2]}${color[2]}${color[3]}${color[3]}`
      : color;
  }
  return undefined;
}

/** 模板编辑器预设（淡色，贴合工作台主色与语义色） */
export const COLUMN_BG_PRESETS = [
  {
    key: 'primary',
    color: '#E8F1FC',
    labelKey: 'page.costLibrary.template.bgPrimary',
  },
  {
    key: 'amber',
    color: '#FFF6E0',
    labelKey: 'page.costLibrary.template.bgAmber',
  },
  {
    key: 'green',
    color: '#EAF7F0',
    labelKey: 'page.costLibrary.template.bgGreen',
  },
  {
    key: 'gray',
    color: '#F4F4F5',
    labelKey: 'page.costLibrary.template.bgGray',
  },
  {
    key: 'rose',
    color: '#FDECEC',
    labelKey: 'page.costLibrary.template.bgRose',
  },
] as const;

/** 默认「总价」高亮（与品牌主色 8% 叠白接近） */
export const DEFAULT_TOTAL_COLUMN_BG = '#E8F1FC';

/** 海运 ALL IN 默认底色（对齐业务 Excel 绿色小计列） */
export const DEFAULT_SEA_ALL_IN_COLUMN_BG = '#EAF7F0';

const ROAD_TOTAL_FIELDS = new Set([
  'allInFmOneWay',
  'allInFmRound',
  'allInNoFm',
]);

/** 显式关闭列底色（写入模板后不再套用总价默认色） */
export const COLUMN_BG_NONE = 'none';

export function defaultColumnBgColor(mode: string, field: string) {
  if (mode === 'road' && ROAD_TOTAL_FIELDS.has(field)) {
    return DEFAULT_TOTAL_COLUMN_BG;
  }
  if (mode === 'sea' && field === 'allIn') {
    return DEFAULT_SEA_ALL_IN_COLUMN_BG;
  }
  return undefined;
}

export function resolveColumnBgColor(
  mode: string,
  field: string,
  overrideBg?: null | string,
) {
  const raw = overrideBg?.trim();
  if (raw === COLUMN_BG_NONE) {
    return undefined;
  }
  const normalized = normalizeColumnBgColor(raw);
  if (normalized) {
    return normalized;
  }
  if (raw) {
    return undefined;
  }
  return defaultColumnBgColor(mode, field);
}

export function applyColumnBgParams(
  column: Record<string, unknown>,
  bgColor?: string,
) {
  const color = normalizeColumnBgColor(bgColor);
  if (!color) {
    return;
  }
  const prevClass = String(column.className ?? '');
  const prevHeader = String(column.headerClassName ?? '');
  column.className = `${prevClass} col-tmpl-bg`.trim();
  column.headerClassName = `${prevHeader} col-tmpl-bg`.trim();
  column.params = {
    ...(column.params as Record<string, unknown> | undefined),
    bgColor: color,
  };
}

export function createTemplateColumnBgStyleHandlers() {
  const resolve = (column: ColumnWithBgParams) => {
    const color = normalizeColumnBgColor(column?.params?.bgColor);
    return color
      ? {
          backgroundColor: color,
        }
      : null;
  };

  return {
    cellStyle: ({ column }: { column: ColumnWithBgParams }) => resolve(column),
    headerCellStyle: ({ column }: { column: ColumnWithBgParams }) =>
      resolve(column),
  };
}
