import type { Recordable } from '@vben/types';

import type { SystemDeptApi } from './dept';

import { requestClient } from '#/api/request';

export namespace SystemUserApi {
  export interface SystemUser {
    dataScope: string;
    dept: SystemDeptApi.Department;
    id: number;
    realName: string;
    roleNames: string[];
    roles: string[];
    status: 0 | 1;
    username: string;
  }

  export interface PageResult {
    items: SystemUser[];
    total: number;
  }

  export interface UserCreate {
    deptId: number;
    homePath?: string;
    password: string;
    realName: string;
    roleCodes: string[];
    status: 0 | 1;
    username: string;
  }

  export interface UserUpdate {
    deptId: number;
    homePath?: string;
    password?: string;
    realName: string;
    roleCodes: string[];
    status: 0 | 1;
  }
}

export async function getUserList(params: Recordable<any>) {
  return requestClient.get<SystemUserApi.PageResult>('/sys/users', { params });
}

export async function createUser(data: SystemUserApi.UserCreate) {
  return requestClient.post<SystemUserApi.SystemUser>('/sys/users', data);
}

export async function updateUser(id: number, data: SystemUserApi.UserUpdate) {
  return requestClient.put<SystemUserApi.SystemUser>(`/sys/users/${id}`, data);
}

export async function deleteUser(id: number) {
  return requestClient.delete(`/sys/users/${id}`);
}
