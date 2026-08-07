import type { VbenFormSchema } from '#/adapter/form';
import type { OnActionClickFn, VxeTableGridOptions } from '#/adapter/vxe-table';
import type { CostTableTemplate, FreightCostRecord } from '#/api/cost';

import { $t } from '#/locales';

import { buildColumnsFromTemplate } from '../shared/build-columns';
import { createCostStatusSearchField } from '../shared/status-search';

const f = (key: string) => $t(`page.costLibrary.seaFields.${key}`);

export function useSeaSearchSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      componentProps: { autocomplete: 'off' },
      fieldName: 'por',
      label: f('por'),
    },
    {
      component: 'Input',
      componentProps: { autocomplete: 'off' },
      fieldName: 'pol',
      label: f('pol'),
    },
    {
      component: 'Input',
      componentProps: { autocomplete: 'off' },
      fieldName: 'pod',
      label: f('pod'),
    },
    {
      component: 'Input',
      componentProps: { autocomplete: 'off' },
      fieldName: 'ssl',
      label: f('ssl'),
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
