import type { VbenFormSchema } from '#/adapter/form';
import type { OnActionClickFn, VxeTableGridOptions } from '#/adapter/vxe-table';
import type { CostTableTemplate, FreightCostRecord } from '#/api/cost';

import { getEnabledContainerTypeOptions } from '#/api/master-data/container-type';
import { $t } from '#/locales';

import { buildColumnsFromTemplate } from '../shared/build-columns';
import { createPortSelectProps } from '../shared/freight-schema';
import { createCostStatusSearchField } from '../shared/status-search';

const f = (key: string) => $t(`page.costLibrary.seaFields.${key}`);

function dateSearchProps() {
  return {
    allowClear: true,
    class: 'w-full',
    format: 'YYYY-MM-DD',
    valueFormat: 'YYYY-MM-DD',
  };
}

/** 搜索栏顺序对齐表头：POR→POL→POD→箱型→运费生效期→运费有效期→SSL→AGENT，状态最后 */
export function useSeaSearchSchema(): VbenFormSchema[] {
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
        portTypes: ['SEAPORT'],
      }),
      fieldName: 'pod',
      label: f('pod'),
    },
    {
      component: 'ApiSelect',
      componentProps: {
        allowClear: true,
        api: getEnabledContainerTypeOptions,
        class: 'w-full',
        immediate: false,
        optionFilterProp: 'label',
        showSearch: true,
      },
      fieldName: 'containerType',
      label: f('containerType'),
    },
    {
      component: 'DatePicker',
      componentProps: dateSearchProps(),
      fieldName: 'freightEffDate',
      label: f('freightEffDate'),
    },
    {
      component: 'DatePicker',
      componentProps: dateSearchProps(),
      fieldName: 'freightValidDate',
      label: f('freightValidDateSearch'),
    },
    {
      component: 'Input',
      componentProps: { autocomplete: 'off' },
      fieldName: 'ssl',
      label: f('ssl'),
    },
    {
      component: 'Input',
      componentProps: { autocomplete: 'off' },
      fieldName: 'agent',
      label: f('agent'),
    },
    createCostStatusSearchField(),
  ];
}

export function useSeaColumns(
  onActionClick: OnActionClickFn<FreightCostRecord>,
  canEdit: boolean,
  template?: CostTableTemplate,
): VxeTableGridOptions<FreightCostRecord>['columns'] {
  return buildColumnsFromTemplate({
    canEdit,
    mode: 'sea',
    nameField: 'pol',
    nameTitle: f('pol'),
    onActionClick,
    seqWidth: 56,
    template,
  });
}

export function getSeaRowName(row: FreightCostRecord) {
  return [row.por, row.pol, row.pod, row.ssl].filter(Boolean).join(' / ');
}
