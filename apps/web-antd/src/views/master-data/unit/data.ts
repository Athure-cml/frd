import type { VbenFormSchema } from '#/adapter/form';
import type { OnActionClickFn, VxeTableGridOptions } from '#/adapter/vxe-table';
import type { UnitApi } from '#/api/unit';

import { $t } from '#/locales';

import {
  buildOperationColumn,
  buildSeqColumn,
} from '../../system/shared/columns';
import { statusTagOptions } from '../../system/shared/tags';

const t = (key: string) => $t(`page.masterData.${key}`);

export function useUnitFormSchema(isEdit: boolean): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      componentProps: {
        disabled: isEdit,
        maxlength: 32,
        placeholder: 'hours',
      },
      fieldName: 'code',
      help: t('hint.unitCodeHelp'),
      label: t('fields.code'),
      rules: 'required',
    },
    {
      component: 'Input',
      componentProps: { maxlength: 64 },
      fieldName: 'name',
      label: t('fields.name'),
      rules: 'required',
    },
    {
      component: 'Textarea',
      componentProps: { maxlength: 256, rows: 2, showCount: true },
      fieldName: 'remark',
      formItemClass: 'col-span-full',
      label: t('fields.remark'),
    },
    {
      component: 'InputNumber',
      componentProps: { class: 'w-full', min: 0 },
      defaultValue: 0,
      fieldName: 'sort',
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
  ];
}

export function useUnitSearchSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      fieldName: 'code',
      label: t('fields.code'),
    },
    {
      component: 'Input',
      fieldName: 'name',
      label: t('fields.name'),
    },
  ];
}

export function useUnitColumns(
  onActionClick: OnActionClickFn<UnitApi.Unit>,
  canManage: boolean,
): VxeTableGridOptions<UnitApi.Unit>['columns'] {
  const columns: VxeTableGridOptions<UnitApi.Unit>['columns'] = [
    buildSeqColumn(),
    {
      align: 'left',
      className: 'col-sys-code',
      field: 'code',
      minWidth: 120,
      slots: { default: 'code' },
      title: t('fields.code'),
    },
    {
      field: 'name',
      minWidth: 140,
      title: t('fields.name'),
    },
    {
      field: 'remark',
      minWidth: 160,
      title: t('fields.remark'),
    },
    {
      align: 'center',
      field: 'sort',
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

export function filterUnits(
  source: UnitApi.Unit[],
  filters: { code?: string; name?: string } = {},
) {
  const match = (value: string, keyword?: string) => {
    if (!keyword?.trim()) {
      return true;
    }
    return value.toLowerCase().includes(keyword.trim().toLowerCase());
  };
  return source.filter(
    (item) => match(item.code, filters.code) && match(item.name, filters.name),
  );
}

export function toUnitSavePayload(
  values: Record<string, any>,
): UnitApi.UnitSave {
  return {
    code: String(values.code ?? '').trim(),
    name: values.name,
    remark: values.remark?.trim() || undefined,
    sort: values.sort ?? 0,
    status: values.status ?? 1,
  };
}
