import type { VbenFormSchema } from '#/adapter/form';
import type { OnActionClickFn, VxeTableGridOptions } from '#/adapter/vxe-table';
import type { CostTableTemplate, RoadCostRecord } from '#/api/cost';

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

function createZipSearchProps() {
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
      return rows.map((row) => ({
        label: `${row.zipCode} · ${row.city}, ${row.stateCode}`,
        value: row.zipCode,
      }));
    },
    class: 'w-full',
    filterOption: false,
    optionFilterProp: 'label',
    params,
    showSearch: true,
    onSearch: setKeyword,
  };
}

function createCitySearchProps() {
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
    optionFilterProp: 'label',
    showSearch: true,
  };
}

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
        portTypes: ['SEAPORT', 'RAIL', 'INLAND'],
      });
      return items.map(({ label, value }) => ({ label, value }));
    },
    class: 'w-full',
    filterOption: false,
    optionFilterProp: 'label',
    params,
    showSearch: true,
    virtual: false,
    onSearch: (keyword: string) => {
      setKeyword(keyword);
    },
  };
}

export function useRoadSearchSchema(): VbenFormSchema[] {
  return [
    {
      component: 'ApiSelect',
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
      componentProps: createCitySearchProps(),
      fieldName: 'por',
      label: t('por'),
    },
    {
      component: 'ApiSelect',
      componentProps: createPortSearchProps(),
      fieldName: 'pol',
      label: t('pol'),
    },
    {
      component: 'Input',
      componentProps: { autocomplete: 'off' },
      fieldName: 'supplier',
      label: t('supplier'),
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
