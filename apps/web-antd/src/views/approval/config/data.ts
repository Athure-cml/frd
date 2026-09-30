import type { VbenFormSchema } from '#/adapter/form';
import type { OnActionClickFn, VxeTableGridOptions } from '#/adapter/vxe-table';
import type { ApprovalApi } from '#/api/approval';

import { $t } from '#/locales';

import { buildOperationColumn } from '../../system/shared/columns';

const t = (key: string) => $t(`page.approval.${key}`);

export function getApprovalConfigObjectOptions() {
  return [{ label: t('configObject.QUOTE'), value: 'QUOTE' as const }];
}

export function formatApprovalConfigFlow(
  flowSteps: ApprovalApi.ConfigFlowStep[] = [],
) {
  if (flowSteps.length === 0) {
    return '-';
  }
  return flowSteps.map((step) => step.approverName).join(' → ');
}

export function useApprovalConfigSearchSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      componentProps: {
        allowClear: true,
        autocomplete: 'off',
        class: 'w-full',
      },
      fieldName: 'configNo',
      label: t('fields.configNo'),
    },
    {
      component: 'Select',
      componentProps: {
        allowClear: true,
        class: 'w-full',
        options: getApprovalConfigObjectOptions(),
      },
      fieldName: 'configObject',
      label: t('fields.configObject'),
    },
  ];
}

export function useApprovalConfigColumns(
  onActionClick: OnActionClickFn<ApprovalApi.ConfigItem>,
  canManage: boolean,
): VxeTableGridOptions<ApprovalApi.ConfigItem>['columns'] {
  const columns: VxeTableGridOptions<ApprovalApi.ConfigItem>['columns'] = [
    {
      field: 'configNo',
      fixed: 'left',
      minWidth: 160,
      title: t('fields.configNo'),
    },
    {
      field: 'configObject',
      formatter: ({ cellValue }) => {
        const matched = getApprovalConfigObjectOptions().find(
          (item) => item.value === cellValue,
        );
        return matched?.label ?? cellValue ?? '-';
      },
      title: t('fields.configObject'),
      width: 120,
    },
    {
      field: 'flowSteps',
      formatter: ({ row }) => formatApprovalConfigFlow(row.flowSteps),
      minWidth: 240,
      title: t('fields.configFlow'),
    },
  ];

  const operationColumn = buildOperationColumn(canManage, onActionClick, {
    nameField: 'configNo',
    nameTitle: t('fields.configNo'),
    operationOptions: ['edit', 'delete'],
    width: 120,
  });
  if (operationColumn) {
    columns.push(operationColumn);
  }

  return columns;
}
