import { requestClient } from '#/api/request';

export namespace SystemRoleApi {
  export interface SystemRole {
    code: string;
    dataScope: string;
    id: number;
    name: string;
    permissions: string[];
    remark?: string;
    status: 0 | 1;
  }

  export interface RoleSave {
    code: string;
    dataScope: string;
    name: string;
    permissionCodes: string[];
    remark?: string;
    status: 0 | 1;
  }
}

export async function getRoleList() {
  return requestClient.get<SystemRoleApi.SystemRole[]>('/sys/roles');
}

export async function createRole(data: SystemRoleApi.RoleSave) {
  return requestClient.post<SystemRoleApi.SystemRole>('/sys/roles', data);
}

export async function updateRole(id: number, data: SystemRoleApi.RoleSave) {
  return requestClient.put<SystemRoleApi.SystemRole>(`/sys/roles/${id}`, data);
}

export async function deleteRole(id: number) {
  return requestClient.delete(`/sys/roles/${id}`);
}
