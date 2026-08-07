import type { VbenFormSchema } from '#/adapter/form';
import type { OnActionClickFn, VxeTableGridOptions } from '#/adapter/vxe-table';
import type { SupplierApi } from '#/api/supplier';

import { z } from '#/adapter/form';
import { $t } from '#/locales';
import { validateRoadFormula } from '#/views/cost-library/road/formula-eval';

import {
  buildCheckboxColumn,
  buildOperationColumn,
} from '../../system/shared/columns';
import { statusTagOptions } from '../../system/shared/tags';

const t = (key: string) => $t(`page.supplier.${key}`);

export const SUPPLIER_TYPE_OPTIONS = [
  { labelKey: 'types.bookingAgent', value: 'BOOKING_AGENT' },
  { labelKey: 'types.fleet', value: 'FLEET' },
  { labelKey: 'types.customsBroker', value: 'CUSTOMS_BROKER' },
  { labelKey: 'types.warehouse', value: 'WAREHOUSE' },
  { labelKey: 'types.dedicatedLine', value: 'DEDICATED_LINE' },
  { labelKey: 'types.containerLeasing', value: 'CONTAINER_LEASING' },
  { labelKey: 'types.other', value: 'OTHER' },
] as const;

export function supplierTypeLabel(code?: string) {
  const found = SUPPLIER_TYPE_OPTIONS.find((item) => item.value === code);
  return found ? t(found.labelKey) : code || '—';
}

export function formatSupplierTypes(types?: string[]) {
  if (!types?.length) {
    return '—';
  }
  return types.map((code) => supplierTypeLabel(code)).join('、');
}

function formulaFieldRules() {
  return z.preprocess(
    (value) =>
      value === null || value === undefined ? undefined : String(value),
    z
      .string()
      .optional()
      .refine(
        (value) => validateRoadFormula(value).ok,
        (value) => ({
          message:
            validateRoadFormula(value).message ||
            $t('page.supplier.formula.invalidShort'),
        }),
      ),
  );
}

function formulaFieldSchema(
  fieldName: string,
  labelKey: string,
  variant: 'fumigationNonOak' | 'fumigationOak' | 'nonFumigation',
): VbenFormSchema {
  return {
    component: 'FormulaBuilder',
    componentProps: { variant },
    fieldName,
    formItemClass: 'col-span-full',
    help: t('formula.help'),
    label: t(labelKey),
    rules: formulaFieldRules(),
  };
}

export function useSupplierFormSchema(
  isEdit: boolean,
  showInternalCode = false,
): VbenFormSchema[] {
  const schema: VbenFormSchema[] = [];
  if (isEdit && showInternalCode) {
    schema.push({
      component: 'Input',
      componentProps: { disabled: true },
      fieldName: 'code',
      label: t('fields.code'),
    });
  }
  schema.push(
    {
      component: 'Input',
      componentProps: { maxlength: 128 },
      fieldName: 'name',
      label: t('fields.name'),
      rules: 'required',
    },
    {
      component: 'CheckboxGroup',
      componentProps: {
        options: SUPPLIER_TYPE_OPTIONS.map((item) => ({
          label: t(item.labelKey),
          value: item.value,
        })),
      },
      defaultValue: [],
      fieldName: 'types',
      formItemClass: 'col-span-full',
      label: t('fields.types'),
    },
    {
      component: 'Input',
      componentProps: { maxlength: 128 },
      fieldName: 'email',
      label: t('fields.email'),
    },
    {
      component: 'Textarea',
      componentProps: { maxlength: 512, rows: 2, showCount: true },
      fieldName: 'remark',
      formItemClass: 'col-span-full',
      label: t('fields.remark'),
    },
    formulaFieldSchema(
      'nonFumigationPackageFormula',
      'fields.nonFumigationPackageFormula',
      'nonFumigation',
    ),
    formulaFieldSchema(
      'fumigationNonOakPackageFormula',
      'fields.fumigationNonOakPackageFormula',
      'fumigationNonOak',
    ),
    formulaFieldSchema(
      'fumigationOakPackageFormula',
      'fields.fumigationOakPackageFormula',
      'fumigationOak',
    ),
    {
      component: 'RadioGroup',
      componentProps: {
        buttonStyle: 'solid',
        options: [
          { label: t('status.enabled'), value: 1 },
          { label: t('status.disabled'), value: 0 },
        ],
        optionType: 'button',
      },
      defaultValue: 1,
      fieldName: 'status',
      label: t('fields.status'),
    },
  );
  return schema;
}

export function buildSupplierSearchSchema(
  showInternalCode = false,
): VbenFormSchema[] {
  const schema: VbenFormSchema[] = [];
  if (showInternalCode) {
    schema.push({
      component: 'Input',
      componentProps: {
        autocomplete: 'off',
        name: 'supplier-search-code',
      },
      fieldName: 'code',
      label: t('fields.code'),
    });
  }
  schema.push(
    {
      component: 'Input',
      componentProps: {
        autocomplete: 'off',
        name: 'supplier-search-name',
      },
      fieldName: 'name',
      label: t('fields.name'),
    },
    {
      component: 'Select',
      componentProps: {
        allowClear: true,
        class: 'w-full',
        options: [
          { label: t('status.enabled'), value: 1 },
          { label: t('status.disabled'), value: 0 },
        ],
      },
      fieldName: 'status',
      label: t('fields.status'),
    },
  );
  return schema;
}

export function useSupplierColumns(
  onActionClick: OnActionClickFn<SupplierApi.Supplier>,
  canEdit: boolean,
  canDelete: boolean,
  showInternalCode = false,
): VxeTableGridOptions<SupplierApi.Supplier>['columns'] {
  const operationOptions: Array<Record<string, any> | string> = [];
  if (canEdit) {
    operationOptions.push({ code: 'edit', text: $t('common.edit') });
  }
  if (canDelete) {
    operationOptions.push({
      code: 'delete',
      danger: true,
      text: $t('common.delete'),
    });
  }

  const operationColumn = buildOperationColumn(
    canEdit || canDelete,
    onActionClick,
    {
      nameField: 'name',
      nameTitle: t('fields.name'),
      operationOptions,
    },
  );

  const columns: VxeTableGridOptions<SupplierApi.Supplier>['columns'] = [
    buildCheckboxColumn(),
  ];
  if (showInternalCode) {
    columns.push({
      field: 'code',
      fixed: 'left',
      minWidth: 120,
      slots: { default: 'code' },
      title: t('fields.code'),
    });
  }
  columns.push(
    {
      field: 'name',
      fixed: showInternalCode ? undefined : 'left',
      minWidth: 160,
      title: t('fields.name'),
    },
    {
      field: 'types',
      formatter: ({ cellValue }: { cellValue?: string[] }) =>
        formatSupplierTypes(cellValue),
      minWidth: 200,
      title: t('fields.types'),
    },
    {
      field: 'email',
      minWidth: 180,
      title: t('fields.email'),
    },
    {
      field: 'remark',
      minWidth: 140,
      title: t('fields.remark'),
    },
    {
      field: 'nonFumigationPackageFormula',
      minWidth: 160,
      title: t('fields.nonFumigationPackageFormula'),
    },
    {
      field: 'fumigationNonOakPackageFormula',
      minWidth: 180,
      title: t('fields.fumigationNonOakPackageFormula'),
    },
    {
      field: 'fumigationOakPackageFormula',
      minWidth: 180,
      title: t('fields.fumigationOakPackageFormula'),
    },
    {
      align: 'center',
      cellRender: {
        name: 'CellTag',
        options: statusTagOptions(),
      },
      field: 'status',
      title: t('fields.status'),
      width: 96,
    },
    {
      field: 'updatedAt',
      formatter: ({ cellValue }: { cellValue?: string }) => cellValue || '—',
      title: t('fields.updatedAt'),
      width: 168,
    },
  );

  if (operationColumn) {
    columns.push(operationColumn);
  }

  return columns;
}

export function toSupplierSavePayload(
  values: Record<string, any>,
): SupplierApi.SupplierSave {
  return {
    email: values.email?.trim() || undefined,
    fumigationNonOakPackageFormula:
      values.fumigationNonOakPackageFormula?.trim() || undefined,
    fumigationOakPackageFormula:
      values.fumigationOakPackageFormula?.trim() || undefined,
    name: values.name,
    nonFumigationPackageFormula:
      values.nonFumigationPackageFormula?.trim() || undefined,
    remark: values.remark?.trim() || undefined,
    status: values.status ?? 1,
    types: Array.isArray(values.types) ? values.types : [],
  };
}
