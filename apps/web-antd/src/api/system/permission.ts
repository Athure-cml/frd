import { requestClient } from '#/api/request';

export namespace SystemPermissionApi {
  export interface Permission {
    code: string;
    id: number;
    name: string;
    sort: number;
    type: string;
  }
}

export async function getPermissionList() {
  return requestClient.get<SystemPermissionApi.Permission[]>(
    '/sys/permissions',
  );
}
