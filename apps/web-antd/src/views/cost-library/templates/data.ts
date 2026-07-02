import type { VbenFormSchema } from '#/adapter/form';
import type { OnActionClickFn, VxeTableGridOptions } from '#/adapter/vxe-table';
import type {
  CostMode,
  CostTableTemplate,
  CostTableTemplateSave,
} from '#/api/cost';

import { $t } from '#/locales';

import { buildOperationColumn } from '../../system/shared/columns';
import {
  countLayoutFields,
  resolveTemplateDisplayName,
} from '../shared/template-layout-utils';

const TEMPLATE_PAGE_META: Record<
  CostMode,
  { descKey: string; titleKey: string }
> = {
  road: {
    descKey: 'page.costLibrary.template.roadPageDesc',
    titleKey: 'page.costLibrary.template.roadMenu',
  },
  sea: {
    descKey: 'page.costLibrary.template.seaPageDesc',
    titleKey: 'page.costLibrary.template.seaMenu',
  },
  fumigation: {
    descKey: 'page.costLibrary.template.fumigationPageDesc',
    titleKey: 'page.costLibrary.template.fumigationMenu',
  },
};

export function templatePageTitle(mode: CostMode) {
  return $t(TEMPLATE_PAGE_META[mode].titleKey);
}

export function templatePageDesc(mode: CostMode) {
  return $t(TEMPLATE_PAGE_META[mode].descKey);
}

export function useTemplateColumns(
  onActionClick: OnActionClickFn<CostTableTemplate>,
  canEdit: boolean,
  canDelete: boolean,
  showInternalCode = false,
): VxeTableGridOptions<CostTableTemplate>['columns'] {
  const columns: VxeTableGridOptions<CostTableTemplate>['columns'] = [];
  if (showInternalCode) {
    columns.push({
      field: 'code',
      fixed: 'left',
      minWidth: 140,
      slots: { default: 'code' },
      title: $t('page.costLibrary.template.fields.code'),
    });
  }
  columns.push(
    {
      field: 'name',
      fixed: showInternalCode ? undefined : 'left',
      minWidth: 180,
      title: $t('page.costLibrary.template.fields.name'),
      formatter: ({ cellValue }: { cellValue: string }) =>
        resolveTemplateDisplayName(cellValue),
    },
    {
      align: 'center',
      className: 'tpl-col-count',
      field: 'columnCount',
      minWidth: 88,
      title: $t('page.costLibrary.template.fields.columnCount'),
      formatter: ({ row }: { row: CostTableTemplate }) =>
        countLayoutFields(row.mode, row.layout),
    },
    {
      field: 'createdAt',
      minWidth: 160,
      title: $t('page.costLibrary.template.fields.createdAt'),
      formatter: ({ cellValue }: { cellValue?: string }) => cellValue || '—',
    },
    {
      align: 'center',
      field: 'inUse',
      minWidth: 100,
      slots: { default: 'inUse' },
      title: $t('page.costLibrary.template.fields.inUse'),
    },
  );

  const operation = buildOperationColumn(canEdit || canDelete, onActionClick, {
    nameField: 'name',
    nameTitle: $t('page.costLibrary.template.fields.name'),
    operationOptions: [
      {
        code: 'edit',
        show: () => canEdit,
      },
      {
        code: 'set-default',
        text: $t('page.costLibrary.template.setDefault'),
        show: (row: CostTableTemplate) => canEdit && !row.isDefault,
      },
      {
        code: 'delete',
        danger: true,
        show: (row: CostTableTemplate) => canDelete && !row.isDefault,
      },
    ],
  });
  if (operation) {
    operation.minWidth = 220;
    operation.width = 220;
    columns?.push(operation);
  }
  return columns;
}

export function toTemplateSavePayload(
  template: CostTableTemplate,
): CostTableTemplateSave {
  return {
    isDefault: template.isDefault,
    layout: template.layout,
    mode: template.mode,
    name: template.name,
  };
}

export function templateViewPermissionForMode(mode: CostMode) {
  return `cost:${mode}:template:view`;
}

export function templateEditPermissionForMode(mode: CostMode) {
  return `cost:${mode}:template:edit`;
}

export function templateDeletePermissionForMode(mode: CostMode) {
  return `cost:${mode}:template:delete`;
}

export function buildTemplateSearchSchema(
  showInternalCode = false,
): VbenFormSchema[] {
  const schema: VbenFormSchema[] = [];
  if (showInternalCode) {
    schema.push({
      component: 'Input',
      componentProps: {
        allowClear: true,
        autocomplete: 'off',
        name: 'template-search-code',
        placeholder: $t('page.costLibrary.template.searchCodePlaceholder'),
      },
      fieldName: 'code',
      label: $t('page.costLibrary.template.fields.code'),
    });
  }
  schema.push({
    component: 'Input',
    componentProps: {
      allowClear: true,
      autocomplete: 'off',
      name: 'template-search-name',
      placeholder: $t('page.costLibrary.template.searchNamePlaceholder'),
    },
    fieldName: 'name',
    label: $t('page.costLibrary.template.fields.name'),
  });
  return schema;
}

export function filterTemplates(
  source: CostTableTemplate[],
  filters: { code?: string; name?: string } = {},
) {
  const codeKeyword = filters.code?.trim().toLowerCase();
  const nameKeyword = filters.name?.trim().toLowerCase();
  if (!codeKeyword && !nameKeyword) {
    return source;
  }
  return source.filter((item) => {
    if (codeKeyword && !item.code.toLowerCase().includes(codeKeyword)) {
      return false;
    }
    if (nameKeyword) {
      const displayName = resolveTemplateDisplayName(item.name).toLowerCase();
      const rawName = item.name.toLowerCase();
      if (
        !displayName.includes(nameKeyword) &&
        !rawName.includes(nameKeyword)
      ) {
        return false;
      }
    }
    return true;
  });
}
