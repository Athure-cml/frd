import type { Recordable } from '@vben/types';

import { requestClient } from '#/api/request';

export namespace CustomerApi {
  export interface Customer {
    address?: string;
    code: string;
    contactName?: string;
    createdAt: string;
    createdByName?: string;
    email?: string;
    id: number;
    name: string;
    phone?: string;
    remark?: string;
    status: 0 | 1;
    updatedAt: string;
  }

  export interface CustomerSave {
    address?: string;
    contactName?: string;
    email?: string;
    name: string;
    phone?: string;
    remark?: string;
    status: 0 | 1;
  }

  export interface PageResult {
    items: Customer[];
    total: number;
  }
}

export async function getCustomerList(params?: Recordable<any>) {
  return requestClient.get<CustomerApi.PageResult>('/customers', { params });
}

export async function getCustomer(id: number) {
  return requestClient.get<CustomerApi.Customer>(`/customers/${id}`);
}

export async function createCustomer(data: CustomerApi.CustomerSave) {
  return requestClient.post<CustomerApi.Customer>('/customers', data);
}

export async function updateCustomer(
  id: number,
  data: CustomerApi.CustomerSave,
) {
  return requestClient.put<CustomerApi.Customer>(`/customers/${id}`, data);
}

export async function deleteCustomer(id: number) {
  return requestClient.delete(`/customers/${id}`);
}
