import type { CostTableTemplate } from '#/api/cost';

export type CostDrawerPayload<T extends Record<string, unknown>> =
  Partial<T> & {
    copyFrom?: boolean;
    template?: CostTableTemplate;
  };

export function toCopyDrawerData<T extends Record<string, unknown>>(
  row: T,
  template?: CostTableTemplate,
): CostDrawerPayload<T> {
  const { id, updatedAt, createdAt, ...rest } = row;
  return {
    ...(rest as Partial<T>),
    copyFrom: true,
    template,
  };
}

export function isCostCopyPayload(
  data: undefined | { copyFrom?: boolean; id?: number },
) {
  return Boolean(data?.copyFrom && !data?.id);
}
