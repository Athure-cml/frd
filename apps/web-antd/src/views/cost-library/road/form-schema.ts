import type { SupplierAllInFormulas } from './formula-eval';

import type { VbenFormSchema } from '#/adapter/form';
import type { RoadCostRecord, RoadCostSave } from '#/api/cost';
import type { GlobalPortApi } from '#/api/master-data/global-port';

import { reactive } from 'vue';

import { useDebounceFn } from '@vueuse/core';

import { searchGlobalPortNameOptions } from '#/api/master-data/global-port';
import { getUsStateList } from '#/api/master-data/us-state';
import {
  getUsStateZipCityNodes,
  searchDestCityNameOptions,
} from '#/api/master-data/us-state-zip';
import { lookupQuoteZip } from '#/api/quote';
import { getSupplierList } from '#/api/supplier';
import { $t } from '#/locales';

import {
  feeValuesFromForm,
  FormulaEvalError,
  formulaForAllInField,
  resolveAllInFromFormulas,
} from './formula-eval';

const t = (key: string) => $t(`page.costLibrary.roadFields.${key}`);

type ZipLookupRow = Awaited<ReturnType<typeof lookupQuoteZip>>[number];

const zipLookupCache = new Map<string, ZipLookupRow>();
const stateIdByCode = new Map<string, number>();
const supplierFormulaCache = new Map<string, SupplierAllInFormulas>();

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

function getSupplierFormulas(name: unknown): SupplierAllInFormulas | undefined {
  if (typeof name !== 'string' || !name.trim()) {
    return undefined;
  }
  return supplierFormulaCache.get(name.trim());
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

function createZipSelectProps() {
  const params = reactive({ keyword: '' });
  const setKeyword = useDebounceFn((keyword: string) => {
    params.keyword = keyword.trim();
  }, 280);

  return {
    allowClear: true,
    api: async (p: { keyword?: string }) => {
      const keyword = p?.keyword?.trim() || '';
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
  const params = reactive({ keyword: '', state: stateCode || '' });
  const setKeyword = useDebounceFn((keyword: string) => {
    params.keyword = keyword.trim();
  }, 280);

  return {
    allowClear: true,
    api: async (p: { keyword?: string; state?: string }) => {
      const keyword = p?.keyword?.trim() || params.keyword || '';
      const state = p?.state || stateCode || '';
      if (state) {
        await ensureStateIdMap();
        const stateId = stateIdByCode.get(state);
        if (stateId) {
          const nodes = await getUsStateZipCityNodes(stateId, { keyword });
          return nodes
            .filter((node): node is typeof node & { city: string } =>
              Boolean(node.city),
            )
            .map((node) => ({
              label: node.city,
              value: node.city,
            }));
        }
      }
      return searchDestCityNameOptions({
        keyword: keyword || undefined,
        limit: 50,
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

/** POR：美国城市接货地 */
function createPorCitySelectProps() {
  const params = reactive({ keyword: '' });
  const setKeyword = useDebounceFn((keyword: string) => {
    params.keyword = keyword.trim();
  }, 280);

  return {
    allowClear: true,
    api: async (p: { keyword?: string }) =>
      searchDestCityNameOptions({
        keyword: p?.keyword,
        limit: 50,
      }),
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

export async function loadSupplierFormulaCache() {
  const result = await getSupplierList({ page: 1, pageSize: 200, status: 1 });
  supplierFormulaCache.clear();
  for (const item of result.items) {
    supplierFormulaCache.set(item.name.trim(), {
      fumigationNonOakPackageFormula: item.fumigationNonOakPackageFormula,
      fumigationOakPackageFormula: item.fumigationOakPackageFormula,
      nonFumigationPackageFormula: item.nonFumigationPackageFormula,
    });
  }
  return result.items;
}

function supplierSelectProps() {
  return {
    allowClear: true,
    api: async () => {
      const items = await loadSupplierFormulaCache();
      return items.map((item) => ({
        label: item.name,
        value: item.name,
      }));
    },
    class: 'w-full',
    showSearch: true,
  };
}

const PORT_TYPES: GlobalPortApi.PortType[] = ['SEAPORT', 'RAIL', 'INLAND'];

export function useRoadFormSchema(): VbenFormSchema[] {
  return [
    {
      component: 'ApiSelect',
      componentProps: (_values, formApi) => ({
        ...createZipSelectProps(),
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
      fieldName: 'zipCode',
      label: t('zipCode'),
      rules: 'required',
    },
    {
      component: 'ApiSelect',
      componentProps: (values) => createCitySelectProps(values.state),
      dependencies: {
        triggerFields: ['state'],
      },
      fieldName: 'city',
      label: t('city'),
      rules: 'required',
    },
    {
      component: 'ApiSelect',
      componentProps: createStateSelectProps(),
      fieldName: 'state',
      label: t('state'),
      rules: 'required',
    },
    {
      component: 'ApiSelect',
      componentProps: createPorCitySelectProps(),
      fieldName: 'por',
      label: t('por'),
      rules: 'required',
    },
    {
      component: 'ApiSelect',
      componentProps: createPortSelectProps({
        portTypes: PORT_TYPES,
      }),
      fieldName: 'pol',
      label: t('pol'),
      rules: 'required',
    },
    {
      component: 'ApiSelect',
      componentProps: supplierSelectProps(),
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
      componentProps: { maxlength: 512, rows: 2, showCount: true },
      fieldName: 'remark',
      formItemClass: 'col-span-full',
      label: t('remark'),
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
  return [
    {
      component: 'DatePicker',
      componentProps: datePickerProps(),
      fieldName: 'validDate',
      label: t('validDate'),
    },
    {
      component: 'ApiSelect',
      componentProps: supplierSelectProps(),
      fieldName: 'supplier',
      label: t('supplier'),
    },
    {
      component: 'InputNumber',
      componentProps: { class: 'w-full', min: 0, precision: 2 },
      fieldName: 'baseFreight',
      label: t('baseFreight'),
    },
    {
      component: 'Textarea',
      componentProps: { maxlength: 512, rows: 2 },
      fieldName: 'remark',
      label: t('remark'),
    },
  ];
}

export function rowToRoadFormValues(row: RoadCostRecord) {
  return { ...row };
}

export function toRoadSavePayload(values: Record<string, any>): RoadCostSave {
  const numOrZero = (v: unknown) =>
    v === null || v === undefined || v === '' || Number.isNaN(Number(v))
      ? 0
      : Number(v);

  return {
    allInFmOneWay: numOrZero(values.allInFmOneWay),
    allInFmRound: numOrZero(values.allInFmRound),
    allInNoFm: numOrZero(values.allInNoFm),
    baseFreight: values.baseFreight,
    chassis: values.chassis,
    city: values.city,
    extraFields: values.extraFields,
    fsc: values.fsc,
    logYardNameAddress: values.logYardNameAddress,
    otherFee: values.otherFee,
    pol: values.pol,
    por: values.por,
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
