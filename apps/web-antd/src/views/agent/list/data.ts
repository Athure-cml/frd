import type { VbenFormSchema } from '#/adapter/form';
import type { OnActionClickFn, VxeTableGridOptions } from '#/adapter/vxe-table';
import type { AgentApi } from '#/api/agent';

import { $t } from '#/locales';

import { buildDragSortColumn } from '../../shared/party-row-drag';
import {
  appendPinOperationOptions,
  buildCheckboxColumn,
  buildOperationColumn,
  buildSeqColumn,
} from '../../system/shared/columns';
import { statusTagOptions } from '../../system/shared/tags';

const t = (key: string) => $t(`page.agent.${key}`);

export function useAgentFormSchema(
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
      fieldName: 'shortName',
      label: t('fields.shortName'),
    },
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

export function buildAgentSearchSchema(
  showInternalCode = false,
): VbenFormSchema[] {
  const schema: VbenFormSchema[] = [];
  if (showInternalCode) {
    schema.push({
      component: 'Input',
      componentProps: {
        autocomplete: 'off',
        name: 'agent-search-code',
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
        name: 'agent-search-name',
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

export function useAgentColumns(
  onActionClick: OnActionClickFn<AgentApi.Agent>,
  canEdit: boolean,
  canDelete: boolean,
  showInternalCode = false,
): VxeTableGridOptions<AgentApi.Agent>['columns'] {
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

  const columns: VxeTableGridOptions<AgentApi.Agent>['columns'] = [
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

export function toAgentSavePayload(
  values: Record<string, any>,
): AgentApi.AgentSave {
  return {
    contactName: values.contactName?.trim() || undefined,
    email: values.email?.trim() || undefined,
    name: values.name,
    phone: values.phone?.trim() || undefined,
    remark: values.remark?.trim() || undefined,
    shortName: values.shortName?.trim() || undefined,
    status: values.status ?? 1,
  };
}
