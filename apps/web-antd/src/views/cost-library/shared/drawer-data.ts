import type { CostTableTemplate } from '#/api/cost';

export type CostDrawerPayload<T extends Record<string, unknown>> =
  Partial<T> & {
    copyFrom?: boolean;
    renewFrom?: boolean;
    renewFromId?: number;
    template?: CostTableTemplate;
  };

export function toCopyDrawerData<T extends Record<string, unknown>>(
  row: T,
  template?: CostTableTemplate,
): CostDrawerPayload<T> {
  const {
    id: _id,
    updatedAt: _updatedAt,
    createdAt: _createdAt,
    ...rest
  } = row;
  return {
    ...(rest as Partial<T>),
    copyFrom: true,
    template,
  };
}

/** 续期：带出旧行数据，清空有效期与生效期，保存时反填源行 */
export function toRenewDrawerData<
  T extends Record<string, unknown> & { id: number },
>(row: T, template?: CostTableTemplate): CostDrawerPayload<T> {
  const {
    id,
    updatedAt: _updatedAt,
    createdAt: _createdAt,
    validDate: _valid,
    ...rest
  } = row;
  const extraFields = {
    ...(rest.extraFields as Record<string, unknown> | undefined),
  };
  delete extraFields.cf_road_eff;
  delete extraFields.cf_road_renewed_from;
  delete extraFields.cf_road_renewed_to;
  return {
    ...(rest as Partial<T>),
    extraFields,
    renewFrom: true,
    renewFromId: id,
    template,
    validDate: undefined,
  };
}

export function isCostCopyPayload(
  data: undefined | { copyFrom?: boolean; id?: number },
) {
  return Boolean(data?.copyFrom && !data?.id);
}

export function isCostRenewPayload(
  data: undefined | { id?: number; renewFrom?: boolean; renewFromId?: number },
) {
  return Boolean(data?.renewFrom && data?.renewFromId && !data?.id);
}
