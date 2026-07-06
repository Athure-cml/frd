import type { VbenFormSchema } from '#/adapter/form';
import type { FreightCostRecord, FreightCostSave } from '#/api/cost';

import { $t } from '#/locales';

const t = (key: string) => $t(`page.costLibrary.${key}`);
const f = (key: string) => $t(`page.costLibrary.seaFields.${key}`);

export function useFreightFormSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      fieldName: 'origin',
      label: f('pol'),
    },
    {
      component: 'Input',
      fieldName: 'destination',
      label: f('pod'),
    },
    {
      component: 'InputNumber',
      componentProps: { class: 'w-full', min: 0, precision: 2 },
      fieldName: 'unitPrice',
      label: f('ofRate'),
    },
    {
      component: 'InputNumber',
      componentProps: { class: 'w-full', min: 0, precision: 2 },
      fieldName: 'buc',
      label: f('buc'),
    },
    {
      component: 'DatePicker',
      componentProps: { class: 'w-full', valueFormat: 'YYYY-MM-DD' },
      fieldName: 'surchargeValidDate',
      label: f('surchargeValidDate'),
    },
    {
      component: 'InputNumber',
      componentProps: { class: 'w-full', min: 0, precision: 2 },
      fieldName: 'allIn',
      label: f('allIn'),
    },
    {
      component: 'Input',
      fieldName: 'carrier',
      label: f('ssl'),
    },
    {
      component: 'Textarea',
      componentProps: { maxlength: 255, rows: 2, showCount: true },
      fieldName: 'remark',
      formItemClass: 'col-span-full',
      label: f('remark'),
    },
    {
      component: 'Input',
      fieldName: 'validDate',
      label: f('validDate'),
    },
    {
      component: 'Select',
      componentProps: {
        class: 'w-full',
        options: [
          { label: t('status.active'), value: 'active' },
          { label: t('status.draft'), value: 'draft' },
          { label: t('status.expired'), value: 'expired' },
        ],
      },
      defaultValue: 'draft',
      fieldName: 'status',
      label: f('status'),
    },
  ];
}

export function useFreightBatchSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Textarea',
      componentProps: { maxlength: 255, rows: 2 },
      fieldName: 'remark',
      label: f('remark'),
    },
    {
      component: 'Input',
      fieldName: 'validDate',
      label: f('validDate'),
    },
    {
      component: 'Select',
      componentProps: {
        allowClear: true,
        class: 'w-full',
        options: [
          { label: t('status.active'), value: 'active' },
          { label: t('status.draft'), value: 'draft' },
          { label: t('status.expired'), value: 'expired' },
        ],
      },
      fieldName: 'status',
      label: f('status'),
    },
    {
      component: 'DatePicker',
      componentProps: { class: 'w-full', valueFormat: 'YYYY-MM-DD' },
      fieldName: 'surchargeValidDate',
      label: f('surchargeValidDate'),
    },
  ];
}

export function rowToFreightFormValues(row: FreightCostRecord) {
  return { ...row };
}

export function toFreightSavePayload(
  values: Record<string, any>,
): FreightCostSave {
  return {
    allIn: values.allIn ?? undefined,
    buc: values.buc ?? undefined,
    carrier: values.carrier,
    currency: 'USD',
    destination: values.destination,
    origin: values.origin,
    remark: values.remark,
    spec: '',
    status: values.status ?? 'draft',
    surchargeValidDate: values.surchargeValidDate,
    unit: '箱',
    unitPrice: values.unitPrice,
    validDate: values.validDate,
    extraFields: values.extraFields,
  };
}
