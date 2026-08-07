import { $t } from '#/locales';

const TEMPLATE_PERMISSION_PATTERN =
  /^cost:(road|sea|fumigation|rail):template:/;

const CUSTOMER_PREFIXES = new Set([
  'agent',
  'customer',
  'shipping_line',
  'supplier',
]);

/** 仅纳入侧栏主数据菜单的权限前缀（不含已下线的内陆 POR / 旧美国州） */
const MASTER_DATA_PREFIXES = new Set([
  'currency',
  'exchange_rate',
  'md_container_type',
  'md_dest_address',
  'md_global_port',
]);

/**
 * 权限码归入侧栏一级菜单（与 MenuRegistry 对齐）。
 * 视图模板权限归入成本库；报表 / 旧主数据等不进入权限树。
 */
export function resolvePermissionModule(code: string): null | string {
  if (code.startsWith('report:')) {
    return null;
  }
  if (code.startsWith('md_us_state:') || code.startsWith('md_inland_por:')) {
    return null;
  }
  // 模板与成本库同属一级「成本库」
  if (TEMPLATE_PERMISSION_PATTERN.test(code) || code.startsWith('cost:')) {
    return 'cost';
  }
  if (code.startsWith('sys:')) {
    return 'sys';
  }
  if (code.startsWith('ai:')) {
    return 'ai';
  }
  const root = code.split(':')[0] ?? '';
  if (CUSTOMER_PREFIXES.has(root)) {
    return 'customer';
  }
  if (MASTER_DATA_PREFIXES.has(root)) {
    return 'masterData';
  }
  if (root === 'dashboard' || root === 'quote') {
    return root;
  }
  return null;
}

/** 与侧栏主菜单顺序一致；AI 助手放在最底部 */
const MODULE_DISPLAY_ORDER = [
  'dashboard',
  'quote',
  'cost',
  'customer',
  'masterData',
  'sys',
  'ai',
] as const;

export function comparePermissionModules(a: string, b: string) {
  const ia = MODULE_DISPLAY_ORDER.indexOf(
    a as (typeof MODULE_DISPLAY_ORDER)[number],
  );
  const ib = MODULE_DISPLAY_ORDER.indexOf(
    b as (typeof MODULE_DISPLAY_ORDER)[number],
  );
  if (ia !== -1 && ib !== -1) {
    return ia - ib;
  }
  if (ia !== -1) {
    return -1;
  }
  if (ib !== -1) {
    return 1;
  }
  return a.localeCompare(b);
}

export function getPermissionModuleLabel(module: string) {
  const key = `page.system.moduleLabels.${module}`;
  const label = $t(key);
  return label === key ? module.toUpperCase() : label;
}
