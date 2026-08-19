import type { VbenFormSchema } from '#/adapter/form';
import type { OnActionClickFn, VxeTableGridOptions } from '#/adapter/vxe-table';
import type { CostTableTemplate, RoadCostRecord } from '#/api/cost';
import type { GlobalPortApi } from '#/api/master-data/global-port';

import { reactive } from 'vue';

import { useDebounceFn } from '@vueuse/core';

import { searchGlobalPortNameOptions } from '#/api/master-data/global-port';
import { getUsStateList } from '#/api/master-data/us-state';
import { searchDestCityNameOptions } from '#/api/master-data/us-state-zip';
import { lookupQuoteZip } from '#/api/quote';
import { $t } from '#/locales';

import { buildColumnsFromTemplate } from '../shared/build-columns';
import { createCostStatusSearchField } from '../shared/status-search';

const t = (key: string) => $t(`page.costLibrary.roadFields.${key}`);

const ROAD_PORT_TYPES: GlobalPortApi.PortType[] = ['SEAPORT', 'RAIL', 'INLAND'];

function createPortSearchProps() {
  const params = reactive({ keyword: '' });
  const setKeyword = useDebounceFn((keyword: string) => {
    params.keyword = keyword.trim();
  }, 280);
  return {
    allowClear: true,
    api: async (p: { keyword?: string }) => {
      const items = await searchGlobalPortNameOptions({
        keyword: p?.keyword,
        limit: 50,
        portTypes: ROAD_PORT_TYPES,
      });
      return items.map(({ label, value }) => ({ label, value }));
    },
    class: 'w-full',
    filterOption: false,
    immediate: false,
    onSearch: (keyword: string) => {
      setKeyword(keyword);
    },
    optionFilterProp: 'label',
    params,
    showSearch: true,
  };
}

function createZipSearchProps() {
  const options = reactive<Array<{ label: string; value: string }>>([]);
  const search = useDebounceFn(async (keyword: string) => {
    const q = keyword.trim();
    if (!q) {
      options.splice(0);
      return;
    }
    const rows = await lookupQuoteZip(q, 30);
    options.splice(
      0,
      options.length,
      ...rows.map((row) => ({
        label: `${row.zipCode} · ${row.city}, ${row.stateCode}`,
        value: row.zipCode,
      })),
    );
  }, 280);
  return {
    allowClear: true,
    class: 'w-full',
    filterOption: false,
    options,
    onSearch: search,
  };
}

function createCitySearchProps() {
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
      return searchDestCityNameOptions({
        keyword,
        limit: 50,
      });
    },
    class: 'w-full',
    filterOption: false,
    immediate: false,
    optionFilterProp: 'label',
    params,
    showSearch: true,
    onSearch: setKeyword,
  };
}

function createStateSearchProps() {
  return {
    allowClear: true,
    api: async () => {
      const states = await getUsStateList();
      return states.map((state) => ({
        label: `${state.code} · ${state.nameZh}`,
        value: state.code,
      }));
    },
    class: 'w-full',
    immediate: false,
    optionFilterProp: 'label',
    showSearch: true,
  };
}

export function useRoadSearchSchema(): VbenFormSchema[] {
  return [
    {
      component: 'AutoComplete',
      componentProps: createZipSearchProps(),
      fieldName: 'zipCode',
      label: t('zipCode'),
    },
    {
      component: 'ApiSelect',
      componentProps: createCitySearchProps(),
      fieldName: 'city',
      label: t('city'),
    },
    {
      component: 'ApiSelect',
      componentProps: createStateSearchProps(),
      fieldName: 'state',
      label: t('state'),
    },
    {
      component: 'ApiSelect',
      componentProps: createPortSearchProps(),
      fieldName: 'por',
      label: t('por'),
    },
    {
      component: 'Input',
      componentProps: { autocomplete: 'off' },
      fieldName: 'supplier',
      label: t('supplier'),
    },
    {
      component: 'InputNumber',
      componentProps: { class: 'w-full', min: 0, precision: 2 },
      fieldName: 'redelivery',
      label: t('redelivery'),
    },
    {
      component: 'DatePicker',
      componentProps: {
        allowClear: true,
        class: 'w-full',
        format: 'YYYY-MM-DD',
        valueFormat: 'YYYY-MM-DD',
      },
      fieldName: 'validDate',
      label: t('validDate'),
    },
    createCostStatusSearchField(),
  ];
}

export function useRoadColumns(
  onActionClick: OnActionClickFn<RoadCostRecord>,
  canEdit: boolean,
  template?: CostTableTemplate,
): VxeTableGridOptions<RoadCostRecord>['columns'] {
  return buildColumnsFromTemplate({
    canEdit,
    mode: 'road',
    nameField: 'supplier',
    nameTitle: t('supplier'),
    onActionClick,
    template,
  });
}

export function getRoadRowName(row: RoadCostRecord) {
  return (
    row.supplier ||
    [row.zipCode, row.city, row.state].filter(Boolean).join(' ') ||
    [row.por, row.pol].filter(Boolean).join(' → ') ||
    `卡车成本 #${row.id}`
  );
}
