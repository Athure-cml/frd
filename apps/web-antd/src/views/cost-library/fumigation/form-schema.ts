import type { VbenFormSchema } from '#/adapter/form';
import type { FumigationCostRecord, FumigationCostSave } from '#/api/cost';

import { $t } from '#/locales';

const f = (key: string) => $t(`page.costLibrary.fumigationFields.${key}`);

export function useFumigationFormSchema(): VbenFormSchema[] {
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
    {
      component: 'Divider',
      fieldName: 'nonOakDivider',
      formItemClass: 'col-span-full',
      hideLabel: true,
      renderComponentContent: () => ({
        default: () => $t('page.costLibrary.fumigationGroups.nonOak'),
      }),
    },
    {
      component: 'InputNumber',
      componentProps: { class: 'w-full', min: 0, precision: 2 },
      fieldName: 'nonOakOutdoor',
      label: f('nonOakOutdoor'),
    },
    {
      component: 'InputNumber',
      componentProps: { class: 'w-full', min: 0, precision: 2 },
      fieldName: 'nonOakIndoor',
      label: f('nonOakIndoor'),
    },
    {
      component: 'Input',
      componentProps: { autocomplete: 'off', placeholder: '850 或 850+100' },
      fieldName: 'nonOakQuoteSummer',
      label: f('nonOakQuoteSummer'),
    },
    {
      component: 'Input',
      componentProps: { autocomplete: 'off', placeholder: '850 或 850+100' },
      fieldName: 'nonOakQuoteWinter',
      label: f('nonOakQuoteWinter'),
    },
    {
      component: 'Divider',
      fieldName: 'oakDivider',
      formItemClass: 'col-span-full',
      hideLabel: true,
      renderComponentContent: () => ({
        default: () => $t('page.costLibrary.fumigationGroups.oak'),
      }),
    },
    {
      component: 'InputNumber',
      componentProps: { class: 'w-full', min: 0, precision: 2 },
      fieldName: 'oakOutdoor',
      label: f('oakOutdoor'),
    },
    {
      component: 'InputNumber',
      componentProps: { class: 'w-full', min: 0, precision: 2 },
      fieldName: 'oakIndoor',
      label: f('oakIndoor'),
    },
    {
      component: 'Input',
      componentProps: { autocomplete: 'off', placeholder: '1550 或 1680+100' },
      fieldName: 'oakQuoteSummer',
      label: f('oakQuoteSummer'),
    },
    {
      component: 'Input',
      componentProps: { autocomplete: 'off', placeholder: '1550 或 1680+100' },
      fieldName: 'oakQuoteWinter',
      label: f('oakQuoteWinter'),
    },
    {
      component: 'Textarea',
      componentProps: { rows: 3 },
      fieldName: 'remark',
      formItemClass: 'col-span-full',
      label: f('remark'),
    },
  ];
}

export function rowToFumigationFormValues(row: FumigationCostRecord) {
  return { ...row };
}

export function toFumigationSavePayload(
  values: Record<string, any>,
): FumigationCostSave {
  return {
    extraFields: values.extraFields,
    nonOakIndoor: values.nonOakIndoor ?? null,
    nonOakOutdoor: values.nonOakOutdoor ?? null,
    nonOakQuoteSummer: values.nonOakQuoteSummer || undefined,
    nonOakQuoteWinter: values.nonOakQuoteWinter || undefined,
    oakIndoor: values.oakIndoor ?? null,
    oakOutdoor: values.oakOutdoor ?? null,
    oakQuoteSummer: values.oakQuoteSummer || undefined,
    oakQuoteWinter: values.oakQuoteWinter || undefined,
    port: values.port,
    remark: values.remark || undefined,
    station: values.station,
  };
}
