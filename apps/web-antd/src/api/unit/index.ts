import { requestClient } from '#/api/request';

export namespace UnitApi {
  export interface Unit {
    code: string;
    id: number;
    name: string;
    remark?: string;
    sort: number;
    status: 0 | 1;
  }

  export type UnitSave = Omit<Unit, 'id'>;
}

export async function getUnitList(params?: {
  code?: string;
  name?: string;
  status?: number;
}) {
  return requestClient.get<UnitApi.Unit[]>('/units', { params });
}

export async function createUnit(data: UnitApi.UnitSave) {
  return requestClient.post<UnitApi.Unit>('/units', data);
}

export async function updateUnit(id: number, data: UnitApi.UnitSave) {
  return requestClient.put<UnitApi.Unit>(`/units/${id}`, data);
}

export async function deleteUnit(id: number) {
  return requestClient.delete(`/units/${id}`);
}

export async function getEnabledUnitOptions() {
  const list = await getUnitList({ status: 1 });
  return list.map((item) => ({
    label: `${item.code} · ${item.name}`,
    value: item.code,
  }));
}
