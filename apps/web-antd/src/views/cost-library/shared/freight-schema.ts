import type { VbenFormSchema } from '#/adapter/form';
import type { FreightCostRecord, FreightCostSave } from '#/api/cost';
import type { GlobalPortApi } from '#/api/master-data/global-port';

import { reactive } from 'vue';

import { useDebounceFn } from '@vueuse/core';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';

import { getAgentList } from '#/api/agent';
import { getEnabledContainerTypeOptions } from '#/api/master-data/container-type';
import { searchGlobalPortNameOptions } from '#/api/master-data/global-port';
import { getShippingLineList } from '#/api/shipping-line';
import { $t } from '#/locales';

dayjs.extend(customParseFormat);

const f = (key: string) => $t(`page.costLibrary.seaFields.${key}`);

const DATE_PARSE_FORMATS = [
  'YYYY-MM-DD',
  'YYYY/MM/DD',
  'YYYY/M/D',
  'YYYY-M-D',
  'YYYY.MM.DD',
  'YYYY.M.D',
];

const DATE_FIELD_KEYS = [
  'freightValidDate',
  'bucValidDate',
  'ebsValidDate',
  'griValidDate',
  'othersValidDate',
] as const;

const SEA_EFF_EXTRA_FIELD_KEYS = [
  'cf_sea_freight_eff',
  'cf_sea_bunker_eff',
  'cf_sea_others_eff',
  'cf_seaFreightEff',
  'cf_seaBunkerEff',
  'cf_seaOthersEff',
] as const;

/** 英文港名 → 中文名（下拉加载时缓存，供 POD 自动带入） */
const portNameZhCache = new Map<string, string>();

export function rememberPortNameZh(nameEn: string, nameZh?: string) {
  const key = nameEn?.trim();
  const zh = nameZh?.trim();
  if (key && zh) {
    portNameZhCache.set(key, zh);
  }
}

export function resolveCnShortNameFromPods(
  pod: null | string | string[] | undefined,
) {
  const names = parsePortNames(pod);
  const zhs = names
    .map((name) => portNameZhCache.get(name))
    .filter(Boolean) as string[];
  return zhs.length > 0 ? zhs.join('/') : undefined;
}

function datePickerProps() {
  return {
    allowClear: true,
    class: 'w-full',
    format: 'YYYY-MM-DD',
    valueFormat: 'YYYY-MM-DD',
  };
}

function numOrZero(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

/** ALL IN = 运费 + BUC + EBS + GRI + OTHERS */
export function computeSeaAllIn(values: Record<string, any>): number {
  const sum =
    numOrZero(values.freight) +
    numOrZero(values.buc) +
    numOrZero(values.ebs) +
    numOrZero(values.gri) +
    numOrZero(values.others);
  return Math.round(sum * 100) / 100;
}

const SEA_ALL_IN_TRIGGER_FIELDS = [
  'freight',
  'buc',
  'ebs',
  'gri',
  'others',
] as const;

function containerTypeSelectProps() {
  return {
    allowClear: true,
    api: getEnabledContainerTypeOptions,
    class: 'w-full',
    maxTagCount: 0,
    maxTagPlaceholder: (
      omittedValues: Array<{ label?: unknown; value?: unknown }>,
    ) =>
      omittedValues
        .map((item) => String(item.value ?? item.label ?? '').trim())
        .filter(Boolean)
        .join('/'),
    mode: 'multiple' as const,
    optionFilterProp: 'label',
    showSearch: true,
  };
}

export function createPortSelectProps(options: {
  multiple?: boolean;
  portTypes?: GlobalPortApi.PortType[];
}) {
  const params = reactive({ keyword: '' });
  const setKeyword = useDebounceFn((keyword: string) => {
    params.keyword = keyword.trim();
  }, 280);

  const base: Record<string, unknown> = {
    allowClear: true,
    api: async (p: { keyword?: string }) => {
      const items = await searchGlobalPortNameOptions({
        keyword: p?.keyword,
        limit: 50,
        portTypes: options.portTypes,
      });
      for (const item of items) {
        rememberPortNameZh(item.value, item.nameZh);
      }
      // label：下拉显示「名称/类型」；value：存名称；optionLabelProp 使选中后只显示名称
      return items.map(({ label, value }) => ({ label, value }));
    },
    class: 'w-full',
    filterOption: false,
    optionFilterProp: 'label',
    // 选中后输入框只展示 value（港口名称），下拉仍展示 label（名称/类型）
    optionLabelProp: 'value',
    params,
    showSearch: true,
    virtual: false,
    onSearch: (keyword: string) => {
      setKeyword(keyword);
    },
  };

  if (options.multiple) {
    return {
      ...base,
      maxTagCount: 0,
      maxTagPlaceholder: (
        omittedValues: Array<{ label?: unknown; value?: unknown }>,
      ) =>
        omittedValues
          .map((item) => String(item.value ?? item.label ?? '').trim())
          .filter(Boolean)
          .join('/'),
      mode: 'multiple' as const,
    };
  }
  return base;
}

/** 船公司 / 代理：从客商列表选名称，下拉可搜，选中后只显示名称 */
function createPartyNameSelectProps(options: {
  fetch: (params: {
    name?: string;
    page: number;
    pageSize: number;
    status: number;
  }) => Promise<{ items: Array<{ name: string }> }>;
}) {
  const params = reactive({ keyword: '' });
  const setKeyword = useDebounceFn((keyword: string) => {
    params.keyword = keyword.trim();
  }, 280);

  return {
    allowClear: true,
    api: async (p: { keyword?: string }) => {
      const result = await options.fetch({
        name: p?.keyword?.trim() || undefined,
        page: 1,
        pageSize: 50,
        status: 1,
      });
      const seen = new Set<string>();
      const list: Array<{ label: string; value: string }> = [];
      for (const item of result.items) {
        const name = String(item.name ?? '').trim();
        if (!name) {
          continue;
        }
        const key = name.toUpperCase();
        if (seen.has(key)) {
          continue;
        }
        seen.add(key);
        list.push({ label: name, value: name });
      }
      return list;
    },
    class: 'w-full',
    filterOption: false,
    optionFilterProp: 'label',
    optionLabelProp: 'value',
    params,
    showSearch: true,
    virtual: false,
    onSearch: (keyword: string) => {
      setKeyword(keyword);
    },
  };
}

/** 兼容历史 Excel 日期格式，供 DatePicker 使用 */
export function normalizeCostDate(value?: null | string) {
  if (!value?.trim()) {
    return undefined;
  }
  const text = value.trim();
  const strict = dayjs(text, DATE_PARSE_FORMATS, true);
  if (strict.isValid()) {
    return strict.format('YYYY-MM-DD');
  }
  const loose = dayjs(text);
  return loose.isValid() ? loose.format('YYYY-MM-DD') : text;
}

export function parseContainerTypes(
  value?: null | string | string[],
): string[] {
  return parsePortNames(value);
}

export function joinContainerTypes(
  value?: null | string | string[],
): string | undefined {
  return joinPortNames(value);
}

export function parsePortNames(value?: null | string | string[]): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }
  if (!value?.trim()) {
    return [];
  }
  return value
    .split('/')
    .map((item) => item.trim())
    .filter(Boolean);
}

export function joinPortNames(
  value?: null | string | string[],
): string | undefined {
  if (Array.isArray(value)) {
    const joined = value
      .map((item) => String(item).trim())
      .filter(Boolean)
      .join('/');
    return joined || undefined;
  }
  const text = value?.trim();
  return text || undefined;
}

export function useFreightFormSchema(): VbenFormSchema[] {
  return [
    {
      component: 'ApiSelect',
      componentProps: createPortSelectProps({
        portTypes: ['INLAND', 'RAIL', 'SEAPORT'],
      }),
      fieldName: 'por',
      label: f('por'),
    },
    {
      component: 'ApiSelect',
      componentProps: createPortSelectProps({
        portTypes: ['SEAPORT'],
      }),
      fieldName: 'pol',
      label: f('pol'),
    },
    {
      component: 'ApiSelect',
      componentProps: createPortSelectProps({
        multiple: true,
        portTypes: ['SEAPORT'],
      }),
      fieldName: 'pod',
      label: f('pod'),
    },
    {
      component: 'Input',
      componentProps: { maxlength: 128 },
      fieldName: 'cnShortName',
      label: f('cnShortName'),
    },
    {
      component: 'Input',
      fieldName: 'enProductName',
      label: f('enProductName'),
    },
    {
      component: 'ApiSelect',
      componentProps: containerTypeSelectProps(),
      fieldName: 'containerType',
      label: f('containerType'),
    },
    {
      component: 'InputNumber',
      componentProps: { class: 'w-full', min: 0, precision: 2 },
      fieldName: 'freight',
      label: f('freight'),
    },
    {
      component: 'DatePicker',
      componentProps: datePickerProps(),
      fieldName: 'freightValidDate',
      label: f('freightValidDate'),
    },
    {
      component: 'Divider',
      fieldName: 'surchargeDivider',
      formItemClass: 'col-span-full',
      hideLabel: true,
      renderComponentContent: () => ({
        default: () => $t('page.costLibrary.seaGroups.surcharge'),
      }),
    },
    {
      component: 'InputNumber',
      componentProps: { class: 'w-full', min: 0, precision: 2 },
      fieldName: 'buc',
      label: f('buc'),
    },
    {
      component: 'DatePicker',
      componentProps: datePickerProps(),
      fieldName: 'bucValidDate',
      label: f('bucValidDate'),
    },
    {
      component: 'InputNumber',
      componentProps: { class: 'w-full', min: 0, precision: 2 },
      fieldName: 'ebs',
      label: f('ebs'),
    },
    {
      component: 'DatePicker',
      componentProps: datePickerProps(),
      fieldName: 'ebsValidDate',
      label: f('ebsValidDate'),
    },
    {
      component: 'InputNumber',
      componentProps: { class: 'w-full', min: 0, precision: 2 },
      fieldName: 'gri',
      label: f('gri'),
    },
    {
      component: 'DatePicker',
      componentProps: datePickerProps(),
      fieldName: 'griValidDate',
      label: f('griValidDate'),
    },
    {
      component: 'InputNumber',
      componentProps: { class: 'w-full', min: 0, precision: 2 },
      fieldName: 'others',
      label: f('others'),
    },
    {
      component: 'DatePicker',
      componentProps: datePickerProps(),
      fieldName: 'othersValidDate',
      label: f('othersValidDate'),
    },
    {
      component: 'InputNumber',
      componentProps: { class: 'w-full', min: 0, precision: 2 },
      fieldName: 'allIn',
      label: f('allIn'),
      dependencies: {
        trigger(values, _actions, formApi) {
          const computed = computeSeaAllIn(values);
          if (computed !== values.allIn) {
            formApi?.setFieldValue?.('allIn', computed);
          }
        },
        triggerFields: [...SEA_ALL_IN_TRIGGER_FIELDS],
      },
      help: () => $t('page.costLibrary.seaFormula.computedBy'),
    },
    {
      component: 'ApiSelect',
      componentProps: createPartyNameSelectProps({
        fetch: getShippingLineList,
      }),
      fieldName: 'ssl',
      label: f('ssl'),
    },
    {
      component: 'ApiSelect',
      componentProps: createPartyNameSelectProps({
        fetch: getAgentList,
      }),
      fieldName: 'agent',
      label: f('agent'),
    },
    {
      component: 'Textarea',
      componentProps: { maxlength: 255, rows: 2, showCount: true },
      fieldName: 'remark',
      formItemClass: 'col-span-full',
      label: f('remark'),
    },
  ];
}

/** 海运批量修改字段与批量复制弹窗一致 */
export function useFreightBatchSchema(): VbenFormSchema[] {
  return useSeaBatchCopySchema();
}

/** 海运批量复制/批量修改可覆盖字段（运费区 / 附加费分区换行） */
export function useSeaBatchCopySchema(): VbenFormSchema[] {
  return [
    {
      component: 'InputNumber',
      componentProps: { class: 'w-full', min: 0, precision: 2 },
      fieldName: 'freight',
      label: f('freight'),
    },
    {
      component: 'ApiSelect',
      componentProps: containerTypeSelectProps(),
      fieldName: 'containerType',
      label: f('containerType'),
    },
    {
      component: 'DatePicker',
      componentProps: datePickerProps(),
      fieldName: 'freightEffDate',
      label: f('effectiveDate'),
    },
    {
      component: 'DatePicker',
      componentProps: datePickerProps(),
      fieldName: 'freightValidDate',
      label: f('freightValidDate'),
    },
    {
      component: 'Divider',
      fieldName: 'bunkerDivider',
      formItemClass: 'col-span-full !my-1',
      hideLabel: true,
    },
    {
      component: 'InputNumber',
      componentProps: { class: 'w-full', min: 0, precision: 2 },
      fieldName: 'buc',
      formItemClass: 'col-span-full',
      label: f('buc'),
    },
    {
      component: 'DatePicker',
      componentProps: datePickerProps(),
      fieldName: 'bucEffDate',
      label: f('effectiveDate'),
    },
    {
      component: 'DatePicker',
      componentProps: datePickerProps(),
      fieldName: 'bucValidDate',
      label: f('bucValidDate'),
    },
    {
      component: 'Divider',
      fieldName: 'othersDivider',
      formItemClass: 'col-span-full !my-1',
      hideLabel: true,
    },
    {
      component: 'InputNumber',
      componentProps: { class: 'w-full', min: 0, precision: 2 },
      fieldName: 'others',
      formItemClass: 'col-span-full',
      label: f('othersSurcharge'),
    },
    {
      component: 'DatePicker',
      componentProps: datePickerProps(),
      fieldName: 'othersEffDate',
      label: f('effectiveDate'),
    },
    {
      component: 'DatePicker',
      componentProps: datePickerProps(),
      fieldName: 'othersValidDate',
      label: f('othersValidDate'),
    },
  ];
}

export function rowToFreightFormValues(row: FreightCostRecord) {
  const values: Record<string, unknown> = {
    ...row,
    containerType: parseContainerTypes(row.containerType),
    pod: parsePortNames(row.pod),
  };
  for (const key of DATE_FIELD_KEYS) {
    values[key] = normalizeCostDate(row[key]);
  }
  const extra = { ...row.extraFields } as Record<string, unknown>;
  for (const key of SEA_EFF_EXTRA_FIELD_KEYS) {
    if (extra[key] !== undefined && extra[key] !== null && extra[key] !== '') {
      extra[key] = normalizeCostDate(String(extra[key]));
    }
  }
  values.extraFields = extra;
  return values;
}

export function toFreightSavePayload(
  values: Record<string, any>,
): FreightCostSave {
  return {
    agent: values.agent || undefined,
    allIn:
      values.allIn === null || values.allIn === undefined || values.allIn === ''
        ? computeSeaAllIn(values)
        : Number(values.allIn),
    buc: values.buc ?? undefined,
    bucValidDate: values.bucValidDate || undefined,
    cnShortName: values.cnShortName || undefined,
    containerType: joinContainerTypes(values.containerType),
    ebs: values.ebs ?? undefined,
    ebsValidDate: values.ebsValidDate || undefined,
    enProductName: values.enProductName || undefined,
    extraFields: values.extraFields,
    freight: values.freight ?? undefined,
    freightValidDate: values.freightValidDate || undefined,
    gri: values.gri ?? undefined,
    griValidDate: values.griValidDate || undefined,
    others: values.others ?? undefined,
    othersValidDate: values.othersValidDate || undefined,
    pod: joinPortNames(values.pod) ?? '',
    pol: values.pol,
    por: values.por || undefined,
    remark: values.remark || undefined,
    ssl: values.ssl,
    status: 'active',
  };
}

/** 打开编辑时预热港口中文缓存，便于已选 POD 再次联动 */
export async function prefetchPortNameZh(names: string[]) {
  const unique = [...new Set(names.map((n) => n.trim()).filter(Boolean))];
  await Promise.all(
    unique.map(async (name) => {
      if (portNameZhCache.has(name)) {
        return;
      }
      const items = await searchGlobalPortNameOptions({
        keyword: name,
        limit: 20,
        portTypes: ['SEAPORT'],
      });
      for (const item of items) {
        rememberPortNameZh(item.value, item.nameZh);
      }
    }),
  );
}
