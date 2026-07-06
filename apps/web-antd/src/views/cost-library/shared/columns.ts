import type { OnActionClickFn, VxeTableGridOptions } from '#/adapter/vxe-table';

import { $t } from '#/locales';

import { buildOperationColumn } from '../../system/shared/columns';

export function buildCostCheckboxColumn() {
  return { fixed: 'left' as const, type: 'checkbox' as const, width: 48 };
}

export function appendCostOperationColumn<T extends { id: number }>(
  columns: VxeTableGridOptions<T>['columns'],
  canEdit: boolean,
  onActionClick: OnActionClickFn<T>,
  nameField: string,
  nameTitle: string,
) {
  const operation = buildOperationColumn(canEdit, onActionClick, {
    nameField,
    nameTitle,
    operationOptions: [
      'edit',
      {
        code: 'copy',
        text: $t('page.costLibrary.actions.copy'),
      },
      'delete',
    ],
  });
  if (operation) {
    operation.title = $t('page.costLibrary.fields.operation');
    operation.minWidth = 220;
    operation.width = 220;
    columns?.push(operation);
  }
  return columns;
}

export function costOperationTitle() {
  return $t('page.costLibrary.fields.operation');
}
