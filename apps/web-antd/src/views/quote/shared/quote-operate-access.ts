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

/** 单据生命周期操作：操作人、超级管理员，或尚未认领（询价递交后待首次保存） */
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
  // 未认领：可读用户即可操作，首次保存后写入操作人
  if (createdBy === null || createdBy === undefined) {
    return true;
  }
  return String(user.userId) === String(createdBy);
}
