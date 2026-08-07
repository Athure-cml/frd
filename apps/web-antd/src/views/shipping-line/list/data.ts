import type { VbenFormSchema } from '#/adapter/form';
import type { OnActionClickFn, VxeTableGridOptions } from '#/adapter/vxe-table';
import type { ShippingLineApi } from '#/api/shipping-line';

import { $t } from '#/locales';

import {
  buildCheckboxColumn,
  buildOperationColumn,
} from '../../system/shared/columns';
import { statusTagOptions } from '../../system/shared/tags';

const t = (key: string) => $t(`page.shippingLine.${key}`);

export function useShippingLineFormSchema(
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

export function buildShippingLineSearchSchema(
  showInternalCode = false,
): VbenFormSchema[] {
  const schema: VbenFormSchema[] = [];
  if (showInternalCode) {
    schema.push({
      component: 'Input',
      componentProps: {
        autocomplete: 'off',
        name: 'shipping-line-search-code',
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
        name: 'shipping-line-search-name',
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

export function useShippingLineColumns(
  onActionClick: OnActionClickFn<ShippingLineApi.ShippingLine>,
  canEdit: boolean,
  canDelete: boolean,
  showInternalCode = false,
): VxeTableGridOptions<ShippingLineApi.ShippingLine>['columns'] {
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

  const columns: VxeTableGridOptions<ShippingLineApi.ShippingLine>['columns'] =
    [buildCheckboxColumn()];
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

export function toShippingLineSavePayload(
  values: Record<string, any>,
): ShippingLineApi.ShippingLineSave {
  return {
    email: values.email?.trim() || undefined,
    name: values.name,
    remark: values.remark?.trim() || undefined,
    status: values.status ?? 1,
  };
}
