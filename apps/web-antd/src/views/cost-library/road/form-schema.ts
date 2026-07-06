import type { VbenFormSchema } from '#/adapter/form';
import type { RoadCostRecord, RoadCostSave } from '#/api/cost';

import { $t } from '#/locales';

const t = (key: string) => $t(`page.costLibrary.roadFields.${key}`);
const f = (key: string) => $t(`page.costLibrary.fields.${key}`);

const amountField = (fieldName: string, titleKey: string): VbenFormSchema => ({
  component: 'InputNumber',
  componentProps: { class: 'w-full', min: 0, precision: 2 },
  fieldName,
  label: t(titleKey),
});

export function useRoadFormSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      fieldName: 'validDate',
      label: t('validDate'),
    },
    {
      component: 'Input',
      fieldName: 'supplier',
      label: t('supplier'),
    },
    {
      component: 'Input',
      fieldName: 'logYardNameAddress',
      formItemClass: 'col-span-full',
      label: t('logYardNameAddress'),
    },
    {
      component: 'Input',
      fieldName: 'zipCode',
      label: t('zipCode'),
    },
    {
      component: 'Input',
      fieldName: 'city',
      label: t('city'),
    },
    {
      component: 'Input',
      fieldName: 'state',
      label: t('state'),
    },
    {
      component: 'Input',
      fieldName: 'por',
      label: t('por'),
    },
    {
      component: 'Input',
      fieldName: 'pol',
      label: t('pol'),
    },
    amountField('baseFreight', 'baseFreight'),
    {
      component: 'InputNumber',
      componentProps: {
        class: 'w-full',
        max: 1,
        min: 0,
        precision: 4,
        step: 0.01,
      },
      fieldName: 'fsc',
      label: t('fsc'),
    },
    amountField('chassis', 'chassis'),
    amountField('owTriAxle', 'owTriAxle'),
    amountField('split', 'split'),
    amountField('stopOff', 'stopOff'),
    amountField('allIn', 'allIn'),
    amountField('allInNonOak', 'allInNonOak'),
    amountField('allInOak', 'allInOak'),
    amountField('waitingFee', 'waitingFee'),
    amountField('redelivery', 'redelivery'),
    amountField('prepull', 'prepull'),
    amountField('nsLift', 'nsLift'),
    {
      component: 'Textarea',
      componentProps: { maxlength: 255, rows: 2, showCount: true },
      fieldName: 'remark',
      formItemClass: 'col-span-full',
      label: t('remark'),
    },
  ];
}

export function useRoadBatchSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      fieldName: 'validDate',
      label: t('validDate'),
    },
    {
      component: 'Input',
      fieldName: 'supplier',
      label: t('supplier'),
    },
    {
      component: 'InputNumber',
      componentProps: {
        class: 'w-full',
        max: 1,
        min: 0,
        precision: 4,
        step: 0.01,
      },
      fieldName: 'fsc',
      label: t('fsc'),
    },
    {
      component: 'Textarea',
      componentProps: { maxlength: 255, rows: 2 },
      fieldName: 'remark',
      label: f('remark'),
    },
  ];
}

export function rowToRoadFormValues(row: RoadCostRecord) {
  return { ...row };
}

export function toRoadSavePayload(values: Record<string, any>): RoadCostSave {
  return {
    allIn: values.allIn ?? 0,
    allInNonOak: values.allInNonOak ?? 0,
    allInOak: values.allInOak ?? 0,
    baseFreight: values.baseFreight ?? 0,
    chassis: values.chassis ?? 0,
    city: values.city,
    fsc: values.fsc ?? 0,
    logYardNameAddress: values.logYardNameAddress,
    zipCode: values.zipCode,
    nsLift: values.nsLift ?? 0,
    owTriAxle: values.owTriAxle ?? 0,
    pol: values.pol,
    por: values.por,
    prepull: values.prepull ?? 0,
    redelivery: values.redelivery ?? 0,
    remark: values.remark,
    split: values.split ?? 0,
    state: values.state,
    stopOff: values.stopOff ?? 0,
    supplier: values.supplier,
    validDate: values.validDate,
    waitingFee: values.waitingFee ?? 0,
    extraFields: values.extraFields,
  };
}
