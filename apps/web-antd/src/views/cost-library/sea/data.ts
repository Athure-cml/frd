import type { VbenFormSchema } from '#/adapter/form';
import type { OnActionClickFn, VxeTableGridOptions } from '#/adapter/vxe-table';
import type { CostTableTemplate, FreightCostRecord } from '#/api/cost';

import { $t } from '#/locales';

import { buildColumnsFromTemplate } from '../shared/build-columns';

const f = (key: string) => $t(`page.costLibrary.seaFields.${key}`);

export function useSeaSearchSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      componentProps: { autocomplete: 'off' },
      fieldName: 'origin',
      label: f('pol'),
    },
    {
      component: 'Input',
      componentProps: { autocomplete: 'off' },
      fieldName: 'destination',
      label: f('pod'),
    },
    {
      component: 'Input',
      componentProps: { autocomplete: 'off' },
      fieldName: 'carrier',
      label: f('ssl'),
    },
    {
      component: 'Select',
      componentProps: {
        allowClear: true,
        class: 'w-full',
        options: [
          { label: $t('page.costLibrary.status.active'), value: 'active' },
          { label: $t('page.costLibrary.status.draft'), value: 'draft' },
          { label: $t('page.costLibrary.status.expired'), value: 'expired' },
        ],
      },
      fieldName: 'status',
      label: f('status'),
    },
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
    nameField: 'origin',
    nameTitle: f('pol'),
    onActionClick,
    seqWidth: 56,
    template,
  });
}

export function getSeaRowName(row: FreightCostRecord) {
  return `${row.origin} → ${row.destination}`;
}
