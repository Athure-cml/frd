import { requestClient } from '#/api/request';

export namespace UsStateApi {
  export interface UsState {
    code: string;
    id: number;
    nameZh: string;
  }

  export type UsStateSave = Omit<UsState, 'id'>;
}

const BASE = '/us-states';

export async function getUsStateList(params?: {
  code?: string;
  nameZh?: string;
}) {
  return requestClient.get<UsStateApi.UsState[]>(BASE, { params });
}

export async function createUsState(data: UsStateApi.UsStateSave) {
  return requestClient.post<UsStateApi.UsState>(BASE, data);
}

export async function updateUsState(id: number, data: UsStateApi.UsStateSave) {
  return requestClient.put<UsStateApi.UsState>(`${BASE}/${id}`, data);
}

export async function deleteUsState(id: number) {
  return requestClient.delete(`${BASE}/${id}`);
}
