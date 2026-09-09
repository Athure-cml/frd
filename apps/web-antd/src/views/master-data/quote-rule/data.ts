import type { VbenFormSchema } from '#/adapter/form';
import type { OnActionClickFn, VxeTableGridOptions } from '#/adapter/vxe-table';
import type { QuoteRuleApi } from '#/api/quote-rule';

import { $t } from '#/locales';

import {
  buildCheckboxColumn,
  buildOperationColumn,
  buildSeqColumn,
} from '../../system/shared/columns';
import { statusTagOptions } from '../../system/shared/tags';

const t = (key: string) => $t(`page.masterData.${key}`);

export const targetFieldOptions = () => [
  {
    label: t('quoteRuleForm.targetField.OCEAN_FREIGHT'),
    value: 'OCEAN_FREIGHT',
  },
  { label: t('quoteRuleForm.targetField.TRUCKING_FEE'), value: 'TRUCKING_FEE' },
  { label: t('quoteRuleForm.targetField.FM_NON_OAK'), value: 'FM_NON_OAK' },
  { label: t('quoteRuleForm.targetField.FM_OAK'), value: 'FM_OAK' },
  { label: t('quoteRuleForm.targetField.DOC_FEE'), value: 'DOC_FEE' },
  {
    label: t('quoteRuleForm.targetField.CARGO_INSURANCE'),
    value: 'CARGO_INSURANCE',
  },
  { label: t('quoteRuleForm.targetField.CARGO_AGENT'), value: 'CARGO_AGENT' },
];

export const conditionTypeOptions = () => [
  { label: t('quoteRuleForm.conditionType.ALWAYS'), value: 'ALWAYS' },
  {
    label: t('quoteRuleForm.conditionType.FUMIGATION_ENABLED'),
    value: 'FUMIGATION_ENABLED',
  },
  {
    label: t('quoteRuleForm.conditionType.FUMIGATION_DISABLED'),
    value: 'FUMIGATION_DISABLED',
  },
  { label: t('quoteRuleForm.conditionType.POD_CHINA'), value: 'POD_CHINA' },
  {
    label: t('quoteRuleForm.conditionType.POD_NOT_CHINA'),
    value: 'POD_NOT_CHINA',
  },
  { label: t('quoteRuleForm.conditionType.BASE_GT'), value: 'BASE_GT' },
  { label: t('quoteRuleForm.conditionType.BASE_LTE'), value: 'BASE_LTE' },
];

export const calcTypeOptions = () => [
  { label: t('quoteRuleForm.calcType.COST_PLUS'), value: 'COST_PLUS' },
  { label: t('quoteRuleForm.calcType.FIXED'), value: 'FIXED' },
  { label: t('quoteRuleForm.calcType.CIF_MULTIPLY'), value: 'CIF_MULTIPLY' },
  { label: t('quoteRuleForm.calcType.CIF_PERCENT'), value: 'CIF_PERCENT' },
];

function labelOf(options: { label: string; value: string }[], value?: string) {
  return options.find((item) => item.value === value)?.label ?? value ?? '-';
}

/** 后端小数费率 → 表单百分比（0.001 → 0.1） */
export function cifRateToPercent(rate?: null | number) {
  if (rate === null || rate === undefined) {
    return undefined;
  }
  return Number((rate * 100).toFixed(6));
}

/** 表单百分比 → 后端小数费率（0.1 → 0.001） */
export function percentToCifRate(percent?: null | number) {
  if (percent === null || percent === undefined) {
    return undefined;
  }
  return percent / 100;
}

export function useQuoteRuleFormSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      componentProps: { class: 'w-full', maxlength: 128 },
      fieldName: 'name',
      formItemClass: 'col-span-full',
      label: t('fields.name'),
      rules: 'required',
    },
    {
      component: 'Select',
      componentProps: {
        class: 'w-full',
        dropdownMatchSelectWidth: true,
        options: targetFieldOptions(),
        showSearch: true,
        optionFilterProp: 'label',
      },
      fieldName: 'targetField',
      label: t('quoteRuleForm.fields.targetField'),
      rules: 'required',
    },
    {
      component: 'Select',
      componentProps: {
        class: 'w-full',
        dropdownMatchSelectWidth: true,
        options: conditionTypeOptions(),
      },
      defaultValue: 'ALWAYS',
      fieldName: 'conditionType',
      label: t('quoteRuleForm.fields.conditionType'),
      rules: 'required',
    },
    {
      component: 'InputNumber',
      componentProps: { class: 'w-full', min: 0, precision: 2 },
      dependencies: {
        show(values) {
          const type = values?.conditionType;
          return type === 'BASE_GT' || type === 'BASE_LTE';
        },
        triggerFields: ['conditionType'],
      },
      fieldName: 'conditionAmount',
      label: t('quoteRuleForm.fields.conditionAmount'),
    },
    {
      component: 'Select',
      componentProps: {
        class: 'w-full',
        dropdownMatchSelectWidth: true,
        options: calcTypeOptions(),
      },
      fieldName: 'calcType',
      label: t('quoteRuleForm.fields.calcType'),
      rules: 'required',
    },
    {
      component: 'InputNumber',
      componentProps: { class: 'w-full', min: 0, precision: 2 },
      dependencies: {
        show(values) {
          return values?.calcType === 'COST_PLUS';
        },
        triggerFields: ['calcType'],
      },
      fieldName: 'addAmount',
      label: t('quoteRuleForm.fields.addAmount'),
    },
    {
      component: 'InputNumber',
      componentProps: { class: 'w-full', min: 0, precision: 2 },
      dependencies: {
        show(values) {
          return values?.calcType === 'FIXED';
        },
        triggerFields: ['calcType'],
      },
      fieldName: 'fixedAmount',
      label: t('quoteRuleForm.fields.fixedAmount'),
    },
    {
      component: 'InputNumber',
      componentProps: { class: 'w-full', min: 0, precision: 4 },
      dependencies: {
        show(values) {
          return values?.calcType === 'CIF_MULTIPLY';
        },
        triggerFields: ['calcType'],
      },
      fieldName: 'cifFactor',
      label: t('quoteRuleForm.fields.cifFactor'),
    },
    {
      component: 'InputNumber',
      componentProps: {
        addonAfter: '%',
        class: 'w-full',
        min: 0,
        precision: 4,
        step: 0.01,
      },
      dependencies: {
        show(values) {
          const type = values?.calcType;
          return type === 'CIF_MULTIPLY' || type === 'CIF_PERCENT';
        },
        triggerFields: ['calcType'],
      },
      fieldName: 'cifRate',
      label: t('quoteRuleForm.fields.cifRate'),
    },
    {
      component: 'InputNumber',
      componentProps: { class: 'w-full', min: 0 },
      defaultValue: 0,
      fieldName: 'sortOrder',
      label: t('fields.sort'),
    },
    {
      component: 'RadioGroup',
      componentProps: {
        buttonStyle: 'solid',
        options: [
          { label: $t('page.system.status.enabled'), value: 1 },
          { label: $t('page.system.status.disabled'), value: 0 },
        ],
        optionType: 'button',
      },
      defaultValue: 1,
      fieldName: 'status',
      label: $t('page.system.fields.status'),
    },
    {
      component: 'Textarea',
      componentProps: {
        class: 'w-full',
        maxlength: 512,
        rows: 2,
        showCount: true,
      },
      controlClass: 'w-full max-w-none',
      fieldName: 'remark',
      formItemClass: 'col-span-full sys-remark-field',
      label: t('fields.remark'),
    },
  ];
}

export function useQuoteRuleSearchSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      fieldName: 'name',
      label: t('fields.name'),
    },
    {
      component: 'Select',
      componentProps: {
        allowClear: true,
        options: targetFieldOptions(),
        showSearch: true,
        optionFilterProp: 'label',
      },
      fieldName: 'targetField',
      label: t('quoteRuleForm.fields.targetField'),
    },
  ];
}

export function useQuoteRuleColumns(
  onActionClick: OnActionClickFn<QuoteRuleApi.QuoteRule>,
  canManage: boolean,
): VxeTableGridOptions<QuoteRuleApi.QuoteRule>['columns'] {
  const columns: VxeTableGridOptions<QuoteRuleApi.QuoteRule>['columns'] = [
    buildCheckboxColumn(),
    buildSeqColumn(),
    {
      field: 'name',
      minWidth: 160,
      title: t('fields.name'),
    },
    {
      field: 'targetField',
      formatter: ({ cellValue }) =>
        labelOf(targetFieldOptions(), cellValue as string),
      minWidth: 120,
      title: t('quoteRuleForm.fields.targetField'),
    },
    {
      field: 'conditionType',
      formatter: ({ cellValue }) =>
        labelOf(conditionTypeOptions(), cellValue as string),
      minWidth: 120,
      title: t('quoteRuleForm.fields.conditionType'),
    },
    {
      align: 'right',
      field: 'conditionAmount',
      minWidth: 88,
      title: t('quoteRuleForm.fields.conditionAmount'),
    },
    {
      field: 'calcType',
      formatter: ({ cellValue }) =>
        labelOf(calcTypeOptions(), cellValue as string),
      minWidth: 100,
      title: t('quoteRuleForm.fields.calcType'),
    },
    {
      align: 'right',
      field: 'addAmount',
      minWidth: 80,
      title: t('quoteRuleForm.fields.addAmount'),
    },
    {
      align: 'right',
      field: 'fixedAmount',
      minWidth: 80,
      title: t('quoteRuleForm.fields.fixedAmount'),
    },
    {
      align: 'center',
      field: 'sortOrder',
      title: t('fields.sort'),
      width: 72,
    },
    {
      align: 'center',
      cellRender: { name: 'CellTag', options: statusTagOptions() },
      field: 'status',
      title: $t('page.system.fields.status'),
      width: 96,
    },
  ];
  const operation = buildOperationColumn(canManage, onActionClick, {
    nameField: 'name',
    nameTitle: t('fields.name'),
    operationOptions: ['edit', 'delete'],
  });
  if (operation) {
    columns.push(operation);
  }
  return columns;
}

export function filterQuoteRules(
  source: QuoteRuleApi.QuoteRule[],
  filters: { name?: string; targetField?: string } = {},
) {
  const match = (value: string, keyword?: string) => {
    if (!keyword?.trim()) {
      return true;
    }
    return value.toLowerCase().includes(keyword.trim().toLowerCase());
  };
  return source.filter(
    (item) =>
      match(item.name, filters.name) &&
      (!filters.targetField || item.targetField === filters.targetField),
  );
}

export function toQuoteRuleSavePayload(
  values: Record<string, any>,
): QuoteRuleApi.QuoteRuleSave {
  return {
    addAmount: values.addAmount ?? undefined,
    calcType: values.calcType,
    cifFactor: values.cifFactor ?? undefined,
    cifRate: percentToCifRate(values.cifRate),
    conditionAmount: values.conditionAmount ?? undefined,
    conditionType: values.conditionType ?? 'ALWAYS',
    fixedAmount: values.fixedAmount ?? undefined,
    name: String(values.name ?? '').trim(),
    remark: values.remark?.trim() || undefined,
    sortOrder: values.sortOrder ?? 0,
    status: values.status ?? 1,
    targetField: values.targetField,
  };
}
