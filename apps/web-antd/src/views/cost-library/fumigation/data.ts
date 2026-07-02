import type { VbenFormSchema } from '#/adapter/form';
import type { OnActionClickFn, VxeTableGridOptions } from '#/adapter/vxe-table';
import type { CostTableTemplate, FumigationCostRecord } from '#/api/cost';

import { $t } from '#/locales';

import { buildFumigationColumnsFromLayout } from '../shared/build-fumigation-columns';
import { getDefaultTemplate } from '../shared/default-templates';

const f = (key: string) => $t(`page.costLibrary.fumigationFields.${key}`);

export function useFumigationSearchSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      componentProps: { autocomplete: 'off' },
      fieldName: 'port',
      label: f('port'),
    },
    {
      component: 'Input',
      componentProps: { autocomplete: 'off' },
      fieldName: 'station',
      label: f('station'),
    },
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
  });
}

export function getFumigationRowName(row: FumigationCostRecord) {
  return `${row.port} / ${row.station}`;
}

export function useFumigationBatchSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Textarea',
      componentProps: { rows: 3 },
      fieldName: 'remark',
      label: f('remark'),
    },
  ];
}
