import type { UserProfileApi } from '#/api/core/user';

type QuoteOperatorUser = null | Pick<
  UserProfileApi.UserInfoDetail,
  'dataScope' | 'roles' | 'userId'
>;

/** 超级管理员：内置 super_admin 或数据范围 ALL */
export function isQuoteSuperAdmin(user?: QuoteOperatorUser): boolean {
  if (!user) {
    return false;
  }
  if (user.dataScope === 'ALL') {
    return true;
  }
  return user.roles?.includes('super_admin') ?? false;
}

/** 单据生命周期操作：创建人或超级管理员 */
export function canOperateQuote(
  user?: QuoteOperatorUser,
  createdBy?: null | number,
): boolean {
  if (!user?.userId) {
    return false;
  }
  if (isQuoteSuperAdmin(user)) {
    return true;
  }
  if (createdBy === null || createdBy === undefined) {
    return false;
  }
  return String(user.userId) === String(createdBy);
}
