import type { VbenFormSchema } from '#/adapter/form';
import type { FumigationCostRecord, FumigationCostSave } from '#/api/cost';

import { reactive } from 'vue';

import { useDebounceFn } from '@vueuse/core';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';

import { searchDestCityNameOptions } from '#/api/master-data/us-state-zip';
import { $t } from '#/locales';

dayjs.extend(customParseFormat);

const f = (key: string) => $t(`page.costLibrary.fumigationFields.${key}`);

const VALIDITY_PARSE_FORMATS = [
  'YYYY/M/D',
  'YYYY/MM/DD',
  'YYYY-M-D',
  'YYYY-MM-DD',
];

const VALIDITY_RANGE_RE =
  /^(\d{4}[/-]\d{1,2}[/-]\d{1,2})\s*[-–—]\s*(\d{4}[/-]\d{1,2}[/-]\d{1,2})$/;

export function createCitySelectProps() {
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

function datePickerProps() {
  return {
    allowClear: true,
    class: 'w-full',
    format: 'YYYY-MM-DD',
    valueFormat: 'YYYY-MM-DD',
  };
}

function normalizeValidityDate(value: string) {
  const text = value.trim();
  const parsed = dayjs(text, VALIDITY_PARSE_FORMATS, true);
  if (parsed.isValid()) {
    return parsed.format('YYYY-MM-DD');
  }
  const loose = dayjs(text);
  return loose.isValid() ? loose.format('YYYY-MM-DD') : undefined;
}

/**
 * 有效期存单日 `YYYY-MM-DD`（生效期已单独字段）。
 * 兼容历史区间：取结束日；兼容 RangePicker 数组：取结束日。
 */
export function normalizeFumigationValidity(
  value?: null | string | string[],
): string | undefined {
  if (Array.isArray(value)) {
    const end = value[1] ?? value[0];
    return end ? normalizeValidityDate(String(end)) : undefined;
  }
  if (!value?.trim()) {
    return undefined;
  }
  const text = value.trim();
  const matched = text.match(VALIDITY_RANGE_RE);
  if (matched?.[2]) {
    return normalizeValidityDate(matched[2]);
  }
  return normalizeValidityDate(text);
}

export function useFumigationFormSchema(): VbenFormSchema[] {
  return [
    {
      component: 'ApiSelect',
      componentProps: createCitySelectProps(),
      fieldName: 'region',
      label: f('region'),
    },
    {
      component: 'Input',
      componentProps: { autocomplete: 'off' },
      fieldName: 'station',
      label: f('station'),
    },
    {
      component: 'Divider',
      fieldName: 'outdoorDivider',
      formItemClass: 'col-span-full',
      hideLabel: true,
      renderComponentContent: () => ({
        default: () => $t('page.costLibrary.fumigationGroups.outdoor'),
      }),
    },
    {
      component: 'InputNumber',
      componentProps: { class: 'w-full', min: 0, precision: 2 },
      fieldName: 'outdoorNonOak',
      label: f('outdoorNonOak'),
    },
    {
      component: 'InputNumber',
      componentProps: { class: 'w-full', min: 0, precision: 2 },
      fieldName: 'outdoorOak',
      label: f('outdoorOak'),
    },
    {
      component: 'DatePicker',
      componentProps: datePickerProps(),
      fieldName: 'outdoorValidity',
      label: f('outdoorValidity'),
    },
    {
      component: 'Divider',
      fieldName: 'indoorDivider',
      formItemClass: 'col-span-full',
      hideLabel: true,
      renderComponentContent: () => ({
        default: () => $t('page.costLibrary.fumigationGroups.indoor'),
      }),
    },
    {
      component: 'InputNumber',
      componentProps: { class: 'w-full', min: 0, precision: 2 },
      fieldName: 'indoorNonOak',
      label: f('indoorNonOak'),
    },
    {
      component: 'InputNumber',
      componentProps: { class: 'w-full', min: 0, precision: 2 },
      fieldName: 'indoorOak',
      label: f('indoorOak'),
    },
    {
      component: 'DatePicker',
      componentProps: datePickerProps(),
      fieldName: 'indoorValidity',
      label: f('indoorValidity'),
    },
    {
      component: 'Textarea',
      componentProps: { rows: 3 },
      fieldName: 'address',
      formItemClass: 'col-span-full',
      label: f('address'),
    },
  ];
}

export function rowToFumigationFormValues(row: FumigationCostRecord) {
  return {
    ...row,
    indoorValidity: normalizeFumigationValidity(row.indoorValidity),
    outdoorValidity: normalizeFumigationValidity(row.outdoorValidity),
  };
}

export function toFumigationSavePayload(
  values: Record<string, any>,
): FumigationCostSave {
  return {
    address: values.address || undefined,
    extraFields: values.extraFields,
    indoorNonOak: values.indoorNonOak ?? null,
    indoorOak: values.indoorOak ?? null,
    indoorValidity: normalizeFumigationValidity(values.indoorValidity) ?? '',
    outdoorNonOak: values.outdoorNonOak ?? null,
    outdoorOak: values.outdoorOak ?? null,
    outdoorValidity: normalizeFumigationValidity(values.outdoorValidity) ?? '',
    region: values.region,
    station: values.station,
    status: 'active',
  };
}
