import type { VbenFormSchema } from '#/adapter/form';
import type { VxeTableGridOptions } from '#/adapter/vxe-table';
import type { OperationLogApi } from '#/api/system/operation-log';

import { $t } from '#/locales';

const t = (key: string) => $t(`page.system.operationLogPage.${key}`);

function buildModuleOptions() {
  return [
    { label: t('modules.sysDept'), value: 'sys:dept' },
    { label: t('modules.sysUser'), value: 'sys:user' },
    { label: t('modules.sysRole'), value: 'sys:role' },
    { label: t('modules.customer'), value: 'customer' },
    { label: t('modules.quote'), value: 'quote' },
    { label: t('modules.costRoad'), value: 'cost:road' },
    { label: t('modules.costSea'), value: 'cost:sea' },
    { label: t('modules.costFumigation'), value: 'cost:fumigation' },
    { label: t('modules.costTemplate'), value: 'cost:template' },
    { label: t('modules.currency'), value: 'currency' },
    { label: t('modules.exchangeRate'), value: 'exchange_rate' },
    { label: t('modules.mdDestAddress'), value: 'md_dest_address' },
    { label: t('modules.mdGlobalPort'), value: 'md_global_port' },
    { label: t('modules.mdInlandPor'), value: 'md_inland_por' },
  ];
}

function buildActionOptions() {
  return [
    { label: t('actions.create'), value: 'CREATE' },
    { label: t('actions.update'), value: 'UPDATE' },
    { label: t('actions.delete'), value: 'DELETE' },
  ];
}

export function getOperationLogModuleLabel(module: string) {
  return (
    buildModuleOptions().find((item) => item.value === module)?.label ?? module
  );
}

export function getOperationLogActionLabel(
  action: OperationLogApi.OperationAction,
) {
  return (
    buildActionOptions().find((item) => item.value === action)?.label ?? action
  );
}

export function useOperationLogSearchSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      fieldName: 'keyword',
      label: t('fields.keyword'),
    },
    {
      component: 'Input',
      fieldName: 'username',
      label: t('fields.username'),
    },
    {
      component: 'Select',
      componentProps: {
        allowClear: true,
        options: buildModuleOptions(),
      },
      fieldName: 'module',
      label: t('fields.module'),
    },
    {
      component: 'Select',
      componentProps: {
        allowClear: true,
        options: buildActionOptions(),
      },
      fieldName: 'action',
      label: t('fields.action'),
    },
  ];
}

export function useOperationLogColumns(): VxeTableGridOptions<OperationLogApi.OperationLog>['columns'] {
  return [
    {
      field: 'createdAt',
      formatter: 'formatDateTime',
      minWidth: 170,
      title: t('fields.createdAt'),
    },
    {
      field: 'realName',
      minWidth: 100,
      title: t('fields.realName'),
    },
    {
      field: 'username',
      minWidth: 110,
      slots: { default: 'username' },
      title: t('fields.username'),
    },
    {
      field: 'module',
      minWidth: 120,
      slots: { default: 'module' },
      title: t('fields.module'),
    },
    {
      field: 'action',
      minWidth: 90,
      slots: { default: 'action' },
      title: t('fields.action'),
    },
    {
      field: 'summary',
      minWidth: 220,
      showOverflow: 'tooltip',
      title: t('fields.summary'),
    },
    {
      field: 'requestUri',
      minWidth: 200,
      showOverflow: 'tooltip',
      title: t('fields.requestUri'),
    },
    {
      field: 'ipAddress',
      minWidth: 120,
      title: t('fields.ipAddress'),
    },
    {
      field: 'success',
      minWidth: 90,
      slots: { default: 'success' },
      title: t('fields.success'),
    },
    {
      field: 'operation',
      fixed: 'right',
      slots: { default: 'operation' },
      title: t('fields.operation'),
      width: 90,
    },
  ];
}
