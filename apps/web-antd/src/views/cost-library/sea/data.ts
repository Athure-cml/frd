import type { VbenFormSchema } from '#/adapter/form';
import type { OnActionClickFn, VxeTableGridOptions } from '#/adapter/vxe-table';
import type { CostTableTemplate, FreightCostRecord } from '#/api/cost';

import { getAgentList } from '#/api/agent';
import { getShippingLineList } from '#/api/shipping-line';
import { $t } from '#/locales';

import { buildColumnsFromTemplate } from '../shared/build-columns';
import {
  createContainerTypeSearchMultiProps,
  createPartyNameSearchSelectProps,
  createPortSearchSelectProps,
} from '../shared/freight-schema';
import MultiPasteSelect from '../shared/multi-paste-select.vue';
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
      component: MultiPasteSelect,
      componentProps: createPortSearchSelectProps([
        'INLAND',
        'RAIL',
        'SEAPORT',
      ]),
      fieldName: 'por',
      label: f('por'),
    },
    {
      component: MultiPasteSelect,
      componentProps: createPortSearchSelectProps(['SEAPORT']),
      fieldName: 'pol',
      label: f('pol'),
    },
    {
      component: MultiPasteSelect,
      componentProps: createPortSearchSelectProps(['SEAPORT']),
      fieldName: 'pod',
      label: f('pod'),
    },
    {
      component: MultiPasteSelect,
      componentProps: createContainerTypeSearchMultiProps(),
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
      component: MultiPasteSelect,
      componentProps: createPartyNameSearchSelectProps({
        fetch: getShippingLineList,
      }),
      fieldName: 'ssl',
      label: f('ssl'),
    },
    {
      component: MultiPasteSelect,
      componentProps: createPartyNameSearchSelectProps({
        fetch: getAgentList,
      }),
      fieldName: 'agent',
      label: f('agent'),
    },
    {
      component: 'Input',
      componentProps: {
        allowClear: true,
        class: 'w-full',
      },
      fieldName: 'remark',
      label: f('remark'),
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
