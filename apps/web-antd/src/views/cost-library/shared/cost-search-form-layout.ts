import type { VbenFormProps } from '#/adapter/form';

/** 与成本库列表页搜索栏一致：大屏一行 4 列，折叠后首行 3 个字段 + 右侧操作按钮 */
export const COST_SEARCH_FORM_LAYOUT = {
  actionLayout: 'rowEnd',
  actionPosition: 'right',
  collapsed: true,
  collapsedRows: 1,
  showCollapseButton: true,
  submitOnChange: false,
  wrapperClass: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
} satisfies Partial<VbenFormProps>;

export function withCostSearchFormLayout<T extends VbenFormProps>(
  options: T,
): T {
  return {
    ...COST_SEARCH_FORM_LAYOUT,
    ...options,
  };
}
