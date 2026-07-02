/** 内置角色：仅超级管理员可维护（含编辑、启停）。 */
export const SUPER_ADMIN_ONLY_ROLE_CODES = ['super_admin', 'admin'] as const;

export function canManageBuiltinRoleRow(
  roleCode: string,
  isSuperAdmin: boolean,
): boolean {
  if (
    SUPER_ADMIN_ONLY_ROLE_CODES.includes(
      roleCode as (typeof SUPER_ADMIN_ONLY_ROLE_CODES)[number],
    )
  ) {
    return isSuperAdmin;
  }
  return true;
}

export function canDeleteRoleRow(roleCode: string): boolean {
  return !SUPER_ADMIN_ONLY_ROLE_CODES.includes(
    roleCode as (typeof SUPER_ADMIN_ONLY_ROLE_CODES)[number],
  );
}
