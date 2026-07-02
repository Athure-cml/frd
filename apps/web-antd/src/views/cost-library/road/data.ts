import type { VbenFormSchema } from '#/adapter/form';
import type { OnActionClickFn, VxeTableGridOptions } from '#/adapter/vxe-table';
import type { CostTableTemplate, RoadCostRecord } from '#/api/cost';

import { $t } from '#/locales';

import { buildColumnsFromTemplate } from '../shared/build-columns';

const t = (key: string) => $t(`page.costLibrary.roadFields.${key}`);

export function useRoadSearchSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      componentProps: { autocomplete: 'off' },
      fieldName: 'supplier',
      label: t('supplier'),
    },
    {
      component: 'Input',
      componentProps: { autocomplete: 'off' },
      fieldName: 'city',
      label: t('city'),
    },
    {
      component: 'Input',
      componentProps: { autocomplete: 'off' },
      fieldName: 'state',
      label: t('state'),
    },
    {
      component: 'Input',
      componentProps: { autocomplete: 'off' },
      fieldName: 'pol',
      label: t('pol'),
    },
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
  return row.supplier || `${row.city} ${row.pol}`;
}
