import { requestClient } from '#/api/request';

export namespace CurrencyApi {
  export interface Currency {
    base: boolean;
    code: string;
    decimalPlaces: number;
    id: number;
    name: string;
    sort: number;
    status: 0 | 1;
    symbol?: string;
  }

  export type CurrencySave = Omit<Currency, 'id'>;
}

export async function getCurrencyList(params?: {
  code?: string;
  name?: string;
  status?: number;
}) {
  return requestClient.get<CurrencyApi.Currency[]>('/currencies', { params });
}

export async function createCurrency(data: CurrencyApi.CurrencySave) {
  return requestClient.post<CurrencyApi.Currency>('/currencies', data);
}

export async function updateCurrency(
  id: number,
  data: CurrencyApi.CurrencySave,
) {
  return requestClient.put<CurrencyApi.Currency>(`/currencies/${id}`, data);
}

export async function deleteCurrency(id: number) {
  return requestClient.delete(`/currencies/${id}`);
}

export async function getEnabledCurrencyOptions() {
  const list = await getCurrencyList({ status: 1 });
  return list.map((item) => ({
    label: `${item.code} · ${item.name}`,
    value: item.code,
  }));
}

export async function getBaseCurrencyCode() {
  const list = await getCurrencyList({ status: 1 });
  return list.find((item) => item.base)?.code ?? list[0]?.code ?? 'CNY';
}

/** 新建记录时的默认币种：优先业务偏好码，否则取基准币 */
export async function resolveDefaultCurrencyCode(options?: {
  mode?: 'fumigation' | 'sea';
  preferred?: string;
}) {
  const list = await getCurrencyList({ status: 1 });
  const codes = new Set(list.map((item) => item.code));
  const preferred =
    options?.preferred ??
    (options?.mode === 'sea'
      ? 'USD'
      : options?.mode === 'fumigation'
        ? 'USD'
        : undefined);
  if (preferred && codes.has(preferred)) {
    return preferred;
  }
  return list.find((item) => item.base)?.code ?? list[0]?.code ?? 'CNY';
}
