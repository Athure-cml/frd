import type { UserInfo } from '@vben/types';

import { requestClient } from '#/api/request';

export namespace UserProfileApi {
  export interface ProfileUpdate {
    avatar?: string;
    email?: string;
    phone?: string;
    realName: string;
  }

  export interface ChangePassword {
    newPassword: string;
    oldPassword: string;
  }

  /** quote-api 用户信息扩展字段 */
  export interface PasswordSecurity {
    level: 'MEDIUM' | 'STRONG' | 'UNKNOWN' | 'WEAK';
    needsUpdate: boolean;
    strength?: number;
    updatedAt?: string;
  }

  export interface UserInfoDetail extends UserInfo {
    dataScope?: string;
    dept?: {
      code?: string;
      id?: number;
      name?: string;
    };
    email?: string;
    passwordSecurity?: PasswordSecurity;
    phone?: string;
    roleNames?: string[];
  }
}

/**
 * 获取用户信息
 */
export async function getUserInfoApi() {
  return requestClient.get<UserProfileApi.UserInfoDetail>('/user/info');
}

/**
 * 更新当前用户资料
 */
export async function updateProfileApi(data: UserProfileApi.ProfileUpdate) {
  return requestClient.put<UserProfileApi.UserInfoDetail>(
    '/user/profile',
    data,
  );
}

/**
 * 上传当前用户头像
 */
export async function uploadAvatarApi(file: File) {
  return requestClient.upload<UserProfileApi.UserInfoDetail>('/user/avatar', {
    file,
  });
}

/**
 * 修改当前用户密码
 */
export async function changePasswordApi(data: UserProfileApi.ChangePassword) {
  return requestClient.put<string>('/user/password', data);
}
