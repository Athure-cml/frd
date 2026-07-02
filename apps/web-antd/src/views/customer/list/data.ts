import type { VbenFormSchema } from '#/adapter/form';
import type { OnActionClickFn, VxeTableGridOptions } from '#/adapter/vxe-table';
import type { CustomerApi } from '#/api/customer';

import { $t } from '#/locales';

import { buildOperationColumn } from '../../system/shared/columns';
import { statusTagOptions } from '../../system/shared/tags';

const t = (key: string) => $t(`page.customer.${key}`);

export function useCustomerFormSchema(
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
      component: 'Input',
      componentProps: { maxlength: 64 },
      fieldName: 'contactName',
      label: t('fields.contactName'),
    },
    {
      component: 'Input',
      componentProps: { maxlength: 32 },
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
      component: 'Input',
      componentProps: { maxlength: 256 },
      fieldName: 'address',
      label: t('fields.address'),
    },
    {
      component: 'Textarea',
      componentProps: { maxlength: 512, rows: 2, showCount: true },
      fieldName: 'remark',
      formItemClass: 'col-span-full',
      label: t('fields.remark'),
    },
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

export function buildCustomerSearchSchema(
  showInternalCode = false,
): VbenFormSchema[] {
  const schema: VbenFormSchema[] = [];
  if (showInternalCode) {
    schema.push({
      component: 'Input',
      componentProps: {
        autocomplete: 'off',
        name: 'customer-search-code',
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
        name: 'customer-search-name',
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

export function useCustomerColumns(
  onActionClick: OnActionClickFn<CustomerApi.Customer>,
  canEdit: boolean,
  canDelete: boolean,
  showInternalCode = false,
): VxeTableGridOptions<CustomerApi.Customer>['columns'] {
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

  const columns: VxeTableGridOptions<CustomerApi.Customer>['columns'] = [];
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
      field: 'contactName',
      minWidth: 100,
      title: t('fields.contactName'),
    },
    {
      field: 'phone',
      minWidth: 120,
      title: t('fields.phone'),
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
      field: 'createdByName',
      title: t('fields.createdBy'),
      width: 100,
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

export function toCustomerSavePayload(
  values: Record<string, any>,
): CustomerApi.CustomerSave {
  return {
    address: values.address?.trim() || undefined,
    contactName: values.contactName?.trim() || undefined,
    email: values.email?.trim() || undefined,
    name: values.name,
    phone: values.phone?.trim() || undefined,
    remark: values.remark?.trim() || undefined,
    status: values.status ?? 1,
  };
}
