import { requestClient } from '#/api/request';

export namespace SystemDeptApi {
  export interface Department {
    code: string;
    id: number;
    name: string;
    parentId: number;
    sort: number;
    status: 0 | 1;
  }

  export type DepartmentSave = Omit<Department, 'id'>;
}

export async function getDepartmentList() {
  return requestClient.get<SystemDeptApi.Department[]>('/sys/departments');
}

export async function createDepartment(data: SystemDeptApi.DepartmentSave) {
  return requestClient.post<SystemDeptApi.Department>('/sys/departments', data);
}

export async function updateDepartment(
  id: number,
  data: SystemDeptApi.DepartmentSave,
) {
  return requestClient.put<SystemDeptApi.Department>(
    `/sys/departments/${id}`,
    data,
  );
}

export async function deleteDepartment(id: number) {
  return requestClient.delete(`/sys/departments/${id}`);
}
