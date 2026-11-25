import type { VbenFormSchema } from '#/adapter/form';
import type { RoadCostRecord, RoadCostSave } from '#/api/cost';
import type { GlobalPortApi } from '#/api/master-data/global-port';

import { reactive } from 'vue';

import { useDebounceFn } from '@vueuse/core';

import { searchGlobalPortNameOptions } from '#/api/master-data/global-port';
import { getUsStateList } from '#/api/master-data/us-state';
import {
  getUsStateZipCityNodes,
  resolveDestZips,
} from '#/api/master-data/us-state-zip';
import { lookupQuoteZip } from '#/api/quote';
import { $t } from '#/locales';

import { createFumigationStationSelectProps } from '../fumigation/fumigation-supplier-cache';
import { ROAD_REMARK_FIELD } from '../shared/field-catalog/road';
import {
  feeValuesFromForm,
  FormulaEvalError,
  formulaForAllInField,
  resolveAllInFromFormulas,
} from './formula-eval';
import {
  createTruckSupplierFormSelectProps,
  getTruckSupplierFormulas,
  loadSupplierFormulaCache,
} from './truck-supplier-cache';

const t = (key: string) => $t(`page.costLibrary.roadFields.${key}`);

type ZipLookupRow = Awaited<ReturnType<typeof lookupQuoteZip>>[number];

const zipLookupCache = new Map<string, ZipLookupRow>();
const stateIdByCode = new Map<string, number>();

export { loadSupplierFormulaCache };

const ALL_IN_TRIGGER_FIELDS = [
  'supplier',
  'baseFreight',
  'fsc',
  'chassis',
  'triTandemAxle',
  'split',
  'stopOff',
  'waitingFee',
  'redelivery',
  'extraFields.cf_road_yard_storage',
  'extraFields.cf_road_extra_chassis',
  'prepull',
  'nsLift',
  'otherFee',
];

const amountField = (fieldName: string, titleKey: string): VbenFormSchema => ({
  component: 'InputNumber',
  componentProps: { class: 'w-full', min: 0, precision: 2 },
  fieldName,
  label: t(titleKey),
});

function getSupplierFormulas(name: unknown) {
  return getTruckSupplierFormulas(name);
}

function allInFieldSchema(
  field: 'allInFmOneWay' | 'allInFmRound' | 'allInNoFm',
): VbenFormSchema {
  return {
    ...amountField(field, field),
    defaultValue: 0,
    dependencies: {
      rules(values) {
        return formulaForAllInField(getSupplierFormulas(values.supplier), field)
          ? 'required'
          : null;
      },
      trigger(values, _actions, formApi) {
        const formulas = getSupplierFormulas(values.supplier);
        const formula = formulaForAllInField(formulas, field);
        if (!formula) {
          const current = values[field];
          if (
            (current === null || current === undefined || current === '') &&
            formApi?.setFieldValue
          ) {
            formApi.setFieldValue(field, 0);
          }
          return;
        }
        try {
          const computed = resolveAllInFromFormulas(
            formulas,
            feeValuesFromForm(values),
          )[field];
          if (computed !== null && computed !== values[field]) {
            formApi?.setFieldValue?.(field, computed);
          }
        } catch (error) {
          if (!(error instanceof FormulaEvalError)) {
            throw error;
          }
        }
      },
      triggerFields: ALL_IN_TRIGGER_FIELDS,
    },
    help(values) {
      const formula = formulaForAllInField(
        getSupplierFormulas(values.supplier),
        field,
      );
      return formula
        ? $t('page.costLibrary.roadFormula.computedBy', [formula])
        : '';
    },
  };
}

function datePickerProps() {
  return {
    allowClear: true,
    class: 'w-full',
    format: 'YYYY-MM-DD',
    valueFormat: 'YYYY-MM-DD',
  };
}

function createPortSelectProps(options: {
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
      return items.map(({ label, value }) => ({ label, value }));
    },
    class: 'w-full',
    filterOption: false,
    optionFilterProp: 'label',
    optionLabelProp: 'value',
    params,
    showSearch: true,
    // 同名港口 value 冲突时，虚拟列表滚动会越滚越重复
    virtual: false,
    onSearch: (keyword: string) => {
      setKeyword(keyword);
    },
  };

  if (options.multiple) {
    base.mode = 'multiple';
  }

  return base;
}

function createZipSelectProps(cityName?: string, stateCode?: string) {
  const params = reactive({
    keyword: '',
    city: (cityName ?? '').trim(),
    state: (stateCode ?? '').trim(),
  });
  const setKeyword = useDebounceFn((keyword: string) => {
    params.keyword = keyword.trim();
  }, 280);

  return {
    allowClear: true,
    api: async (p: { city?: string; keyword?: string; state?: string }) => {
      const keyword = p?.keyword?.trim() || '';
      const city = (p?.city ?? params.city ?? '').trim();
      const state = (p?.state ?? params.state ?? '').trim();
      // City+State 已确定时先给出主数据候选：唯一 1 个，多个（1:N）全部列出供选
      if (city && state) {
        try {
          const [item] = await resolveDestZips([{ city, state }]);
          const candidates =
            item?.status === 'unique' && item.zipCode
              ? [item.zipCode]
              : item?.status === 'ambiguous'
                ? (item.candidates ?? [])
                : [];
          if (candidates.length > 0) {
            const matched = keyword
              ? candidates.filter((zip) => zip.includes(keyword))
              : candidates;
            if (matched.length > 0) {
              return matched.map((zip) => ({ label: zip, value: zip }));
            }
          }
          if (!keyword) {
            return [];
          }
        } catch {
          // 候选解析失败时退回通用 ZIP 搜索
        }
      }
      if (!keyword) {
        return [];
      }
      const rows = await lookupQuoteZip(keyword, 30);
      return rows.map((row) => {
        zipLookupCache.set(row.zipCode, row);
        return {
          label: `${row.zipCode} · ${row.city}, ${row.stateCode}`,
          value: row.zipCode,
        };
      });
    },
    class: 'w-full',
    filterOption: false,
    optionFilterProp: 'label',
    params,
    showSearch: true,
    onSearch: (keyword: string) => {
      setKeyword(keyword);
    },
  };
}

async function ensureStateIdMap() {
  if (stateIdByCode.size > 0) {
    return;
  }
  const states = await getUsStateList();
  for (const state of states) {
    stateIdByCode.set(state.code, state.id);
  }
}

function createStateSelectProps() {
  return {
    allowClear: true,
    api: async () => {
      const states = await getUsStateList();
      for (const state of states) {
        stateIdByCode.set(state.code, state.id);
      }
      return states.map((state) => ({
        label: `${state.code} · ${state.nameZh}`,
        value: state.code,
      }));
    },
    class: 'w-full',
    optionFilterProp: 'label',
    showSearch: true,
  };
}

function createCitySelectProps(stateCode?: string) {
  const state = (stateCode || '').trim();
  const params = reactive({ keyword: '', state });
  const setKeyword = useDebounceFn((keyword: string) => {
    params.keyword = keyword.trim();
  }, 280);

  return {
    allowClear: true,
    class: 'w-full',
    // 城市必须先由州限定：未选州时禁用且无选项
    disabled: !state,
    placeholder: state ? undefined : $t('page.quote.sheet.selectStateFirst'),
    api: async (p: { keyword?: string; state?: string }) => {
      const code = (p?.state || state || '').trim();
      const keyword = p?.keyword?.trim() || params.keyword || '';
      if (!code) {
        return [];
      }
      await ensureStateIdMap();
      const stateId = stateIdByCode.get(code);
      if (!stateId) {
        return [];
      }
      const nodes = await getUsStateZipCityNodes(stateId, { keyword });
      return nodes
        .filter((node): node is typeof node & { city: string } =>
          Boolean(node.city),
        )
        .map((node) => ({
          label: node.city,
          value: node.city,
        }));
    },
    filterOption: false,
    optionFilterProp: 'label',
    params,
    showSearch: true,
    onSearch: (keyword: string) => {
      setKeyword(keyword);
    },
  };
}

/**
 * City+State 反查邮编：
 * - unique：直接回填；
 * - ambiguous（1:N）：保持为空，由 ZIP 下拉列出该 City+State 的全部候选；
 * - notFound：留空手填。
 */
async function autoFillRoadZip(
  cityName: string,
  stateCode: string,
  existingZip: string,
  formApi?: { setFieldValue?: (field: string, value: unknown) => void },
) {
  const city = cityName.trim();
  const state = stateCode.trim();
  if (!city || !state || !formApi?.setFieldValue) {
    return;
  }
  try {
    const [item] = await resolveDestZips([{ city, state }]);
    if (!item) {
      return;
    }
    if (item.canonicalCity && item.canonicalCity !== city) {
      formApi.setFieldValue('city', item.canonicalCity);
    }
    if (existingZip.trim()) {
      return;
    }
    if (item.status === 'unique' && item.zipCode) {
      formApi.setFieldValue('zipCode', item.zipCode);
    }
  } catch {
    // 解析失败不阻塞录入
  }
}

async function applyZipLookup(
  zip: string,
  setFieldValue: (field: string, value: unknown) => void,
) {
  const code = zip?.trim();
  if (!code) {
    return;
  }
  let row = zipLookupCache.get(code);
  if (!row) {
    const rows = await lookupQuoteZip(code, 10);
    row =
      rows.find((item) => item.zipCode === code) ??
      (rows.length === 1 ? rows[0] : undefined);
    if (row) {
      zipLookupCache.set(row.zipCode, row);
    }
  }
  if (!row) {
    return;
  }
  setFieldValue('zipCode', row.zipCode);
  setFieldValue('city', row.city);
  setFieldValue('state', row.stateCode);
}

const PORT_TYPES: GlobalPortApi.PortType[] = ['SEAPORT', 'RAIL', 'INLAND'];

export function useRoadFormSchema(): VbenFormSchema[] {
  return [
    {
      component: 'ApiSelect',
      componentProps: (values, formApi) => ({
        ...createZipSelectProps(
          String(values.city ?? ''),
          String(values.state ?? ''),
        ),
        onChange: (value: unknown) => {
          const zip =
            typeof value === 'string'
              ? value
              : value &&
                  typeof value === 'object' &&
                  'value' in (value as Record<string, unknown>)
                ? String((value as { value: unknown }).value ?? '')
                : String(value ?? '');
          if (!zip || zip === '[object Object]') {
            return;
          }
          void applyZipLookup(zip, (field, next) => {
            formApi?.setFieldValue?.(field, next);
          });
        },
      }),
      dependencies: {
        // City 或 State 变化时刷新候选：City+State 命中的邮编直接列出（1:N 时全列）
        triggerFields: ['state', 'city'],
      },
      fieldName: 'zipCode',
      label: t('zipCode'),
      rules: 'required',
    },
    {
      component: 'ApiSelect',
      componentProps: (_values, formApi) => ({
        ...createStateSelectProps(),
        onChange: () => {
          // 换州即重新定位：城市与邮编必须重选
          formApi?.setFieldValue?.('city', '');
          formApi?.setFieldValue?.('zipCode', '');
        },
      }),
      fieldName: 'state',
      label: t('state'),
      rules: 'required',
    },
    {
      component: 'ApiSelect',
      componentProps: (values, formApi) => ({
        ...createCitySelectProps(values.state),
        onChange: (value: unknown) => {
          const cityName =
            typeof value === 'string'
              ? value
              : String((value as { value?: unknown })?.value ?? value ?? '');
          // 换城市后旧 ZIP 必然失效：先清空，再按新 City+State 重新解析/补全
          formApi?.setFieldValue?.('zipCode', '');
          void autoFillRoadZip(
            cityName,
            String(values.state ?? ''),
            '',
            formApi,
          );
        },
      }),
      dependencies: {
        triggerFields: ['state'],
      },
      fieldName: 'city',
      label: t('city'),
      rules: 'required',
    },
    {
      component: 'ApiSelect',
      componentProps: createPortSelectProps({
        portTypes: PORT_TYPES,
      }),
      fieldName: 'por',
      label: t('por'),
      rules: 'required',
    },
    {
      component: 'ApiSelect',
      componentProps: createFumigationStationSelectProps(),
      fieldName: 'station',
      label: t('station'),
    },
    {
      component: 'ApiSelect',
      componentProps: createPortSelectProps({
        portTypes: PORT_TYPES,
      }),
      fieldName: 'pol',
      label: t('pol'),
    },
    {
      component: 'ApiSelect',
      componentProps: createTruckSupplierFormSelectProps(),
      fieldName: 'supplier',
      label: t('supplier'),
      rules: 'required',
    },
    amountField('baseFreight', 'baseFreight'),
    {
      component: 'InputNumber',
      componentProps: {
        addonAfter: '%',
        class: 'w-full',
        min: 0,
        precision: 2,
      },
      fieldName: 'fsc',
      label: t('fsc'),
    },
    amountField('chassis', 'chassis'),
    amountField('triTandemAxle', 'triTandemAxle'),
    amountField('split', 'split'),
    amountField('stopOff', 'stopOff'),
    allInFieldSchema('allInNoFm'),
    allInFieldSchema('allInFmOneWay'),
    allInFieldSchema('allInFmRound'),
    amountField('waitingFee', 'waitingFee'),
    amountField('redelivery', 'redelivery'),
    amountField('prepull', 'prepull'),
    amountField('nsLift', 'nsLift'),
    amountField('otherFee', 'otherFee'),
    {
      component: 'Textarea',
      componentProps: {
        class: 'w-full',
        maxlength: 512,
        rows: 4,
        showCount: true,
      },
      fieldName: 'remark',
      // 与 REMARK 平分一行：强制从左列起，避免被上一字段挤到右列单独换行
      formItemClass: 'col-start-1',
      label: t('operationRemark'),
    },
    {
      component: 'DatePicker',
      componentProps: datePickerProps(),
      fieldName: 'validDate',
      label: t('validDate'),
    },
    {
      component: 'Input',
      fieldName: 'logYardNameAddress',
      formItemClass: 'col-span-full',
      label: t('logYardNameAddress'),
    },
  ];
}

export function useRoadBatchSchema(): VbenFormSchema[] {
  // 字段顺序与默认表头 fieldOrder 一致（仅含可批量修改项）
  return [
    {
      component: 'InputNumber',
      componentProps: {
        addonAfter: '%',
        class: 'w-full',
        min: 0,
        precision: 2,
      },
      fieldName: 'fsc',
      label: t('fsc'),
    },
    amountField('chassis', 'chassis'),
    amountField('triTandemAxle', 'triTandemAxle'),
    amountField('split', 'split'),
    amountField('stopOff', 'stopOff'),
    amountField('waitingFee', 'waitingFee'),
    amountField('redelivery', 'redelivery'),
    {
      component: 'InputNumber',
      componentProps: { class: 'w-full', min: 0, precision: 2 },
      fieldName: 'cf_road_yard_storage',
      label: t('yardStorage'),
    },
    {
      component: 'InputNumber',
      componentProps: { class: 'w-full', min: 0, precision: 2 },
      fieldName: 'cf_road_extra_chassis',
      label: t('extraChassis'),
    },
    amountField('prepull', 'prepull'),
    amountField('otherFee', 'otherFee'),
    amountField('allInNoFm', 'allInNoFm'),
    amountField('allInFmOneWay', 'allInFmOneWay'),
    amountField('allInFmRound', 'allInFmRound'),
    {
      component: 'Textarea',
      componentProps: { maxlength: 512, rows: 2, showCount: true },
      fieldName: 'remark',
      formItemClass: 'col-span-full',
      label: t('operationRemark'),
    },
    {
      component: 'Textarea',
      componentProps: { maxlength: 512, rows: 2, showCount: true },
      fieldName: ROAD_REMARK_FIELD,
      formItemClass: 'col-span-full',
      label: t('remark'),
    },
    {
      component: 'DatePicker',
      componentProps: datePickerProps(),
      fieldName: 'validDate',
      label: t('validDate'),
    },
  ];
}

function readonlyAllInHintField(
  field: 'allInFmOneWay' | 'allInFmRound' | 'allInNoFm',
): VbenFormSchema {
  return {
    component: 'Input',
    componentProps: {
      disabled: true,
      placeholder: $t('page.costLibrary.hint.batchRenewAllInAuto'),
    },
    fieldName: field,
    label: t(field),
  };
}

/** 批量续期：与单条续期字段一致（不含路线/供应商；ALL IN 只读提示） */
export function useRoadBatchRenewSchema(): VbenFormSchema[] {
  return [
    {
      component: 'ApiSelect',
      componentProps: createPortSelectProps({
        portTypes: PORT_TYPES,
      }),
      fieldName: 'pol',
      label: t('pol'),
    },
    amountField('baseFreight', 'baseFreight'),
    {
      component: 'InputNumber',
      componentProps: {
        addonAfter: '%',
        class: 'w-full',
        min: 0,
        precision: 2,
      },
      fieldName: 'fsc',
      label: t('fsc'),
    },
    amountField('chassis', 'chassis'),
    amountField('triTandemAxle', 'triTandemAxle'),
    amountField('split', 'split'),
    amountField('stopOff', 'stopOff'),
    readonlyAllInHintField('allInNoFm'),
    readonlyAllInHintField('allInFmOneWay'),
    readonlyAllInHintField('allInFmRound'),
    amountField('waitingFee', 'waitingFee'),
    amountField('redelivery', 'redelivery'),
    amountField('prepull', 'prepull'),
    amountField('nsLift', 'nsLift'),
    amountField('otherFee', 'otherFee'),
    {
      component: 'InputNumber',
      componentProps: { class: 'w-full', min: 0, precision: 2 },
      fieldName: 'cf_road_yard_storage',
      label: t('yardStorage'),
    },
    {
      component: 'InputNumber',
      componentProps: { class: 'w-full', min: 0, precision: 2 },
      fieldName: 'cf_road_extra_chassis',
      label: t('extraChassis'),
    },
    {
      component: 'Input',
      componentProps: { class: 'w-full' },
      fieldName: 'logYardNameAddress',
      formItemClass: 'col-span-full',
      label: t('logYardNameAddress'),
    },
    {
      component: 'DatePicker',
      componentProps: datePickerProps(),
      fieldName: 'cf_road_eff',
      label: 'EFFECTIVE TIME',
      rules: 'required',
    },
    {
      component: 'DatePicker',
      componentProps: datePickerProps(),
      fieldName: 'validDate',
      label: t('validDate'),
    },
    {
      component: 'Textarea',
      componentProps: { maxlength: 512, rows: 2, showCount: true },
      fieldName: 'remark',
      formItemClass: 'col-span-full',
      label: t('operationRemark'),
    },
    {
      component: 'Textarea',
      componentProps: { maxlength: 512, rows: 2, showCount: true },
      fieldName: ROAD_REMARK_FIELD,
      formItemClass: 'col-span-full',
      label: t('remark'),
    },
  ];
}

/** 批量复制：费用 / 时间 / 备注相关字段（与表头可覆盖项一致） */
export function useRoadBatchCopySchema(): VbenFormSchema[] {
  return [
    amountField('baseFreight', 'baseFreight'),
    {
      component: 'InputNumber',
      componentProps: {
        addonAfter: '%',
        class: 'w-full',
        min: 0,
        precision: 2,
      },
      fieldName: 'fsc',
      label: t('fsc'),
    },
    amountField('chassis', 'chassis'),
    amountField('triTandemAxle', 'triTandemAxle'),
    amountField('split', 'split'),
    amountField('stopOff', 'stopOff'),
    amountField('waitingFee', 'waitingFee'),
    amountField('redelivery', 'redelivery'),
    {
      component: 'InputNumber',
      componentProps: { class: 'w-full', min: 0, precision: 2 },
      fieldName: 'cf_road_yard_storage',
      label: t('yardStorage'),
    },
    {
      component: 'InputNumber',
      componentProps: { class: 'w-full', min: 0, precision: 2 },
      fieldName: 'cf_road_extra_chassis',
      label: t('extraChassis'),
    },
    amountField('prepull', 'prepull'),
    amountField('nsLift', 'nsLift'),
    amountField('otherFee', 'otherFee'),
    {
      component: 'DatePicker',
      componentProps: datePickerProps(),
      fieldName: 'cf_road_eff',
      label: 'EFFECTIVE TIME',
    },
    {
      component: 'DatePicker',
      componentProps: datePickerProps(),
      fieldName: 'validDate',
      label: t('validDate'),
    },
    {
      component: 'Textarea',
      componentProps: { maxlength: 512, rows: 2, showCount: true },
      fieldName: 'remark',
      formItemClass: 'col-span-full',
      label: t('operationRemark'),
    },
    {
      component: 'Textarea',
      componentProps: { maxlength: 512, rows: 2, showCount: true },
      fieldName: ROAD_REMARK_FIELD,
      formItemClass: 'col-span-full',
      label: t('remark'),
    },
  ];
}

export function rowToRoadFormValues(row: RoadCostRecord) {
  return { ...row };
}

export function toRoadSavePayload(values: Record<string, any>): RoadCostSave {
  const numOrNull = (v: unknown) => {
    if (v === null || v === undefined || v === '') {
      return undefined;
    }
    const n = Number(v);
    return Number.isNaN(n) ? undefined : n;
  };

  return {
    allInFmOneWay: numOrNull(values.allInFmOneWay),
    allInFmRound: numOrNull(values.allInFmRound),
    allInNoFm: numOrNull(values.allInNoFm),
    baseFreight: values.baseFreight,
    chassis: values.chassis,
    city: values.city,
    extraFields: values.extraFields,
    fsc: values.fsc,
    logYardNameAddress: values.logYardNameAddress,
    otherFee: values.otherFee,
    pol: values.pol,
    por: values.por,
    station: values.station?.trim() || undefined,
    prepull: values.prepull,
    redelivery: values.redelivery,
    remark: values.remark,
    split: values.split,
    state: values.state,
    status: 'active',
    stopOff: values.stopOff,
    supplier: values.supplier,
    nsLift: values.nsLift,
    triTandemAxle: values.triTandemAxle,
    validDate: values.validDate,
    waitingFee: values.waitingFee,
    zipCode: values.zipCode,
  };
}
