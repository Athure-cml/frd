import type { VbenFormSchema } from '#/adapter/form';
import type { OnActionClickFn, VxeTableGridOptions } from '#/adapter/vxe-table';
import type { CostTableTemplate, FumigationCostRecord } from '#/api/cost';

import { $t } from '#/locales';

import { buildFumigationColumnsFromLayout } from '../shared/build-fumigation-columns';
import { getDefaultTemplate } from '../shared/default-templates';
import MultiPasteSelect from '../shared/multi-paste-select.vue';
import { createCostStatusSearchField } from '../shared/status-search';
import { createRegionPortSearchMultiProps } from './form-schema';
import { createFumigationStationSearchMultiProps } from './fumigation-supplier-cache';

const f = (key: string) => $t(`page.costLibrary.fumigationFields.${key}`);

function dateSearchProps() {
  return {
    allowClear: true,
    class: 'w-full',
    format: 'YYYY-MM-DD',
    valueFormat: 'YYYY-MM-DD',
  };
}

/**
 * 搜索栏顺序对齐表头：REGION → STATION → 生效期 → 有效期，状态最后。
 * 新版熏蒸为单级表头（生效期 + 单条有效期），不再区分 FM-OUT / FM-IN 有效期。
 */
export function useFumigationSearchSchema(): VbenFormSchema[] {
  return [
    {
      component: MultiPasteSelect,
      componentProps: createRegionPortSearchMultiProps(),
      fieldName: 'region',
      label: f('region'),
    },
    {
      component: MultiPasteSelect,
      componentProps: createFumigationStationSearchMultiProps(),
      fieldName: 'station',
      label: f('station'),
    },
    {
      component: 'DatePicker',
      componentProps: dateSearchProps(),
      fieldName: 'effectiveDate',
      label: f('effectiveDateSearch'),
    },
    {
      component: 'DatePicker',
      componentProps: dateSearchProps(),
      fieldName: 'validity',
      label: f('outdoorValidity'),
    },
    createCostStatusSearchField(),
  ];
}

export function useFumigationColumns(
  onActionClick: OnActionClickFn<FumigationCostRecord>,
  canEdit: boolean,
  template?: CostTableTemplate,
): VxeTableGridOptions<FumigationCostRecord>['columns'] {
  const activeTemplate = template ?? getDefaultTemplate('fumigation');
  return buildFumigationColumnsFromLayout(activeTemplate.layout, {
    canEdit,
    onActionClick,
    seqWidth: 56,
    stationDisplayShort: true,
  });
}

export function getFumigationRowName(row: FumigationCostRecord) {
  return `${row.region} / ${row.station}`;
}

export function useFumigationBatchSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Textarea',
      componentProps: { rows: 3 },
      fieldName: 'address',
      label: f('address'),
    },
  ];
}
