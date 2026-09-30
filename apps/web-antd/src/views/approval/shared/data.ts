import type { VbenFormSchema } from '#/adapter/form';
import type { OnActionClickFn, VxeTableGridOptions } from '#/adapter/vxe-table';
import type { ApprovalApi } from '#/api/approval';

import { $t } from '#/locales';

import { buildOperationColumn } from '../../system/shared/columns';

const t = (key: string) => $t(`page.approval.${key}`);

export type ApprovalListStatus = ApprovalApi.ListItem['status'];

export function getApprovalStatusOptions() {
  return [
    { label: t('status.PENDING'), value: 'PENDING' },
    { label: t('status.APPROVED'), value: 'APPROVED' },
    { label: t('status.REJECTED'), value: 'REJECTED' },
    { label: t('status.WITHDRAWN'), value: 'WITHDRAWN' },
  ];
}

export function useApprovalSearchSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      componentProps: {
        allowClear: true,
        autocomplete: 'off',
        class: 'w-full',
      },
      fieldName: 'approvalNo',
      label: t('fields.approvalNo'),
    },
    {
      component: 'Select',
      componentProps: {
        allowClear: true,
        class: 'w-full',
        options: getApprovalStatusOptions(),
      },
      fieldName: 'status',
      label: t('fields.status'),
    },
  ];
}

export function useApprovalColumns(
  onActionClick: OnActionClickFn<ApprovalApi.ListItem>,
): VxeTableGridOptions<ApprovalApi.ListItem>['columns'] {
  const columns: VxeTableGridOptions<ApprovalApi.ListItem>['columns'] = [
    {
      field: 'approvalNo',
      minWidth: 180,
      showOverflow: true,
      title: t('fields.approvalNo'),
      width: 180,
    },
    {
      field: 'approvalType',
      formatter: ({ row }: { row: ApprovalApi.ListItem }) => {
        if (row.approvalType === 'QUOTE_REVISION') {
          return t('type.quoteRevision');
        }
        return t('type.quote');
      },
      minWidth: 140,
      showOverflow: true,
      title: t('fields.approvalType'),
      width: 160,
    },
    {
      field: 'relatedDocNo',
      minWidth: 160,
      showOverflow: true,
      title: t('fields.relatedDocNo'),
      width: 160,
    },
    {
      field: 'currentNode',
      minWidth: 160,
      showOverflow: true,
      title: t('fields.currentNode'),
    },
    {
      field: 'initiatorName',
      minWidth: 100,
      showOverflow: true,
      title: t('fields.initiatorName'),
    },
    {
      field: 'initiatorDept',
      minWidth: 120,
      showOverflow: true,
      title: t('fields.initiatorDept'),
    },
    {
      field: 'initiatedAt',
      minWidth: 180,
      showOverflow: true,
      title: t('fields.initiatedAt'),
      width: 180,
    },
    {
      field: 'completedAt',
      minWidth: 180,
      showOverflow: true,
      title: t('fields.completedAt'),
      width: 180,
    },
    {
      field: 'duration',
      minWidth: 120,
      showOverflow: true,
      title: t('fields.duration'),
      width: 120,
    },
    {
      align: 'center',
      field: 'status',
      minWidth: 100,
      slots: { default: 'status' },
      title: t('fields.status'),
      width: 100,
    },
  ];

  const operationColumn = buildOperationColumn(true, onActionClick, {
    nameField: 'approvalNo',
    nameTitle: t('fields.approvalNo'),
    operationOptions: [{ code: 'view', text: t('actions.view') }],
    width: 100,
  });
  if (operationColumn) {
    columns.push(operationColumn);
  }

  return columns;
}

export function resolveApprovalStatusTag(status: ApprovalListStatus) {
  const matched = getApprovalStatusOptions().find(
    (item) => item.value === status,
  );
  const colorMap: Record<ApprovalListStatus, string> = {
    APPROVED: 'success',
    PENDING: 'blue',
    REJECTED: 'error',
    WITHDRAWN: 'warning',
  };
  return {
    color: colorMap[status] ?? 'default',
    label: matched?.label ?? status,
  };
}
