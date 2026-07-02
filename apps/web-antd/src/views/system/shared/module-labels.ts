import { $t } from '#/locales';

const TEMPLATE_PERMISSION_PATTERN = /^cost:(road|sea|fumigation):template:/;

/** 权限码所属模块（模板权限归入 template，与成本库分离） */
export function resolvePermissionModule(code: string) {
  if (TEMPLATE_PERMISSION_PATTERN.test(code)) {
    return 'template';
  }
  const parts = code.split(':');
  if (parts.length >= 3) {
    return `${parts[0]}_${parts[1]}`;
  }
  return parts[0] ?? 'other';
}

const MODULE_DISPLAY_ORDER = [
  'dashboard',
  'cost',
  'template',
  'customer',
  'currency',
  'exchange_rate',
  'md_dest_address',
  'md_global_port',
  'md_inland_por',
  'quote',
  'report',
  'sys',
] as const;

export function comparePermissionModules(a: string, b: string) {
  const ia = MODULE_DISPLAY_ORDER.indexOf(
    a as (typeof MODULE_DISPLAY_ORDER)[number],
  );
  const ib = MODULE_DISPLAY_ORDER.indexOf(
    b as (typeof MODULE_DISPLAY_ORDER)[number],
  );
  if (ia >= 0 && ib >= 0) {
    return ia - ib;
  }
  if (ia >= 0) {
    return -1;
  }
  if (ib >= 0) {
    return 1;
  }
  return a.localeCompare(b);
}

export function getPermissionModuleLabel(module: string) {
  const key = `page.system.moduleLabels.${module}`;
  const label = $t(key);
  return label === key ? module.toUpperCase() : label;
}
