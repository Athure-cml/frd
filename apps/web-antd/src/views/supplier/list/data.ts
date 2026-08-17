import type { VbenFormSchema } from '#/adapter/form';
import type { OnActionClickFn, VxeTableGridOptions } from '#/adapter/vxe-table';
import type { SupplierApi } from '#/api/supplier';

import { z } from '#/adapter/form';
import { $t } from '#/locales';
import { validateRoadFormula } from '#/views/cost-library/road/formula-eval';

import { buildDragSortColumn } from '../../shared/party-row-drag';
import {
  appendPinOperationOptions,
  buildCheckboxColumn,
  buildOperationColumn,
  buildSeqColumn,
} from '../../system/shared/columns';
import { statusTagOptions } from '../../system/shared/tags';

const t = (key: string) => $t(`page.supplier.${key}`);

export type SupplierCategory = SupplierApi.SupplierCategory;

export function supportsFormulas(category: SupplierCategory) {
  return category === 'TRUCK';
}

export function supportsTypes(category: SupplierCategory) {
  return category === 'OTHER';
}

export function categoryTitleKey(category: SupplierCategory) {
  switch (category) {
    case 'FUMIGATION': {
      return 'fumigationList';
    }
    case 'OTHER': {
      return 'otherList';
    }
    case 'YARD': {
      return 'yardList';
    }
    default: {
      return 'truckList';
    }
  }
}

export function categoryHintKey(category: SupplierCategory) {
  switch (category) {
    case 'FUMIGATION': {
      return 'hint.fumigationList';
    }
    case 'OTHER': {
      return 'hint.otherList';
    }
    case 'YARD': {
      return 'hint.yardList';
    }
    default: {
      return 'hint.truckList';
    }
  }
}

export function categoryExportFilename(category: SupplierCategory) {
  switch (category) {
    case 'FUMIGATION': {
      return '熏蒸供应商.xlsx';
    }
    case 'OTHER': {
      return '其他供应商.xlsx';
    }
    case 'YARD': {
      return '仓库堆场.xlsx';
    }
    default: {
      return '卡车供应商.xlsx';
    }
  }
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
  category: SupplierCategory,
  isEdit: boolean,
  showInternalCode = false,
  typeOptions: Array<{ label: string; value: string }> = [],
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
      component: 'Input',
      componentProps: { maxlength: 64 },
      fieldName: 'shortName',
      label: t('fields.shortName'),
    },
  );

  if (supportsTypes(category)) {
    schema.push({
      component: 'CheckboxGroup',
      componentProps: {
        options: typeOptions,
      },
      defaultValue: [],
      fieldName: 'types',
      formItemClass: 'col-span-full',
      label: t('fields.types'),
    });
  }

  schema.push(
    {
      component: 'Input',
      componentProps: { maxlength: 64 },
      fieldName: 'contactName',
      label: t('fields.contactName'),
    },
    {
      component: 'Input',
      componentProps: { maxlength: 64 },
      fieldName: 'phone',
      label: t('fields.phone'),
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
  );

  if (supportsFormulas(category)) {
    schema.push(
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
    );
  }

  schema.push({
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
  });
  return schema;
}

export function buildSupplierSearchSchema(
  category: SupplierCategory,
  showInternalCode = false,
  typeOptions: Array<{ label: string; value: string }> = [],
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
  schema.push({
    component: 'Input',
    componentProps: {
      autocomplete: 'off',
      name: 'supplier-search-name',
    },
    fieldName: 'name',
    label: t('fields.name'),
  });
  if (supportsTypes(category)) {
    schema.push({
      component: 'Select',
      componentProps: {
        allowClear: true,
        class: 'w-full',
        options: typeOptions,
      },
      fieldName: 'typeId',
      label: t('fields.types'),
    });
  }
  schema.push({
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
  });
  return schema;
}

export function useSupplierColumns(
  category: SupplierCategory,
  onActionClick: OnActionClickFn<SupplierApi.Supplier>,
  canEdit: boolean,
  canDelete: boolean,
  showInternalCode = false,
  typeNameMap: Record<string, string> = {},
): VxeTableGridOptions<SupplierApi.Supplier>['columns'] {
  const operationOptions: Array<Record<string, any> | string> = [];
  if (canEdit) {
    appendPinOperationOptions(operationOptions, {
      pin: t('actions.pin'),
      unpin: t('actions.unpin'),
    });
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
      width: canEdit ? 220 : 168,
    },
  );

  const columns: VxeTableGridOptions<SupplierApi.Supplier>['columns'] = [
    buildCheckboxColumn(),
    buildSeqColumn(),
  ];
  const dragColumn = buildDragSortColumn(canEdit);
  if (dragColumn) {
    columns.push(dragColumn);
  }
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
      className: 'party-name-col',
      field: 'name',
      fixed: showInternalCode ? undefined : 'left',
      headerClassName: 'party-name-col',
      minWidth: 160,
      showOverflow: 'ellipsis',
      slots: { default: 'name' },
      title: t('fields.name'),
    },
    {
      field: 'shortName',
      minWidth: 120,
      title: t('fields.shortName'),
    },
  );

  if (supportsTypes(category)) {
    columns.push({
      field: 'types',
      formatter: ({ cellValue }: { cellValue?: string[] }) => {
        if (!cellValue?.length) {
          return '—';
        }
        return cellValue.map((id) => typeNameMap[id] || id).join('、');
      },
      minWidth: 180,
      title: t('fields.types'),
    });
  }

  columns.push(
    {
      field: 'contactName',
      minWidth: 110,
      title: t('fields.contactName'),
    },
    {
      field: 'phone',
      minWidth: 120,
      title: t('fields.phone'),
    },
    {
      field: 'email',
      minWidth: 160,
      title: t('fields.email'),
    },
    {
      field: 'remark',
      minWidth: 140,
      title: t('fields.remark'),
    },
  );

  if (supportsFormulas(category)) {
    columns.push(
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
    );
  }

  columns.push(
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
  category: SupplierCategory,
  values: Record<string, any>,
): SupplierApi.SupplierSave {
  const payload: SupplierApi.SupplierSave = {
    category,
    contactName: values.contactName?.trim() || undefined,
    email: values.email?.trim() || undefined,
    name: values.name,
    phone: values.phone?.trim() || undefined,
    remark: values.remark?.trim() || undefined,
    shortName: values.shortName?.trim() || undefined,
    status: values.status ?? 1,
  };
  if (supportsTypes(category)) {
    payload.types = Array.isArray(values.types) ? values.types.map(String) : [];
  }
  if (supportsFormulas(category)) {
    payload.nonFumigationPackageFormula =
      values.nonFumigationPackageFormula?.trim() || undefined;
    payload.fumigationNonOakPackageFormula =
      values.fumigationNonOakPackageFormula?.trim() || undefined;
    payload.fumigationOakPackageFormula =
      values.fumigationOakPackageFormula?.trim() || undefined;
  }
  return payload;
}
