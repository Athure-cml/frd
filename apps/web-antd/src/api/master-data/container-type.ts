import { requestClient } from '#/api/request';

export namespace ContainerTypeApi {
  export interface ContainerType {
    code: string;
    id: number;
    name: string;
    remark?: string;
    sort: number;
    status: 0 | 1;
  }

  export type ContainerTypeSave = Omit<ContainerType, 'id'>;
}

const BASE = '/container-types';

export async function getContainerTypeList(params?: {
  code?: string;
  name?: string;
}) {
  return requestClient.get<ContainerTypeApi.ContainerType[]>(BASE, { params });
}

export async function getEnabledContainerTypes() {
  return requestClient.get<ContainerTypeApi.ContainerType[]>(`${BASE}/enabled`);
}

export async function createContainerType(
  data: ContainerTypeApi.ContainerTypeSave,
) {
  return requestClient.post<ContainerTypeApi.ContainerType>(BASE, data);
}

export async function updateContainerType(
  id: number,
  data: ContainerTypeApi.ContainerTypeSave,
) {
  return requestClient.put<ContainerTypeApi.ContainerType>(
    `${BASE}/${id}`,
    data,
  );
}

export async function deleteContainerType(id: number) {
  return requestClient.delete(`${BASE}/${id}`);
}

export async function getEnabledContainerTypeOptions() {
  const list = await getEnabledContainerTypes();
  return list.map((item) => ({
    label: item.code,
    title: item.name,
    value: item.code,
  }));
}
