<script lang="ts" setup>
import type {
  OnActionClickParams,
  VxeTableGridOptions,
} from '#/adapter/vxe-table';
import type { CostMode, CostTableTemplate } from '#/api/cost';

import { computed, onActivated, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { useAccess } from '@vben/access';
import { Page } from '@vben/common-ui';
import { Plus } from '@vben/icons';

import { Button, message, Modal, Tag } from 'ant-design-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  deleteCostTableTemplate,
  listCostTableTemplates,
  setDefaultCostTableTemplate,
} from '#/api/cost/templates';
import { $t } from '#/locales';
import { useInternalCodeVisibility } from '#/utils/internal-code-access';

import { useI18nFormOptions } from '../../shared/use-i18n-form-options';
import {
  resolveActiveTemplate,
  saveTemplateId,
} from '../shared/use-table-templates';
import {
  buildTemplateSearchSchema,
  filterTemplates,
  templateDeletePermissionForMode,
  templateEditPermissionForMode,
  templatePageDesc,
  templatePageTitle,
  useTemplateColumns,
} from './data';

import './templates.css';

const COST_MODES: CostMode[] = new Set(['fumigation', 'road', 'sea']);

const route = useRoute();
const router = useRouter();
const { hasAccessByCodes } = useAccess();
const { canViewInternalCodes } = useInternalCodeVisibility();

const activeMode = computed<CostMode>(() => {
  const mode = route.meta.costMode as CostMode | undefined;
  return mode && COST_MODES.has(mode) ? mode : 'road';
});

const pageTitle = computed(() => templatePageTitle(activeMode.value));

const pageDesc = computed(() => templatePageDesc(activeMode.value));

const activeTemplateId = ref<number>();

function syncActiveTemplateId(templates: CostTableTemplate[]) {
  const enabled = templates.find((item) => item.isDefault);
  if (enabled) {
    activeTemplateId.value = enabled.id;
    return;
  }
  activeTemplateId.value = resolveActiveTemplate(
    templates,
    activeMode.value,
  )?.id;
}

const canEdit = computed(() =>
  hasAccessByCodes([templateEditPermissionForMode(activeMode.value)]),
);

const canDelete = computed(() =>
  hasAccessByCodes([templateDeletePermissionForMode(activeMode.value)]),
);

function buildColumns() {
  return useTemplateColumns(
    onActionClick,
    canEdit.value,
    canDelete.value,
    canViewInternalCodes.value,
  );
}

function onCreate() {
  router.push({
    name: 'CostTemplateCreate',
    params: { mode: activeMode.value },
  });
}

function onEdit(row: CostTableTemplate) {
  router.push({
    name: 'CostTemplateEdit',
    params: { id: String(row.id), mode: activeMode.value },
  });
}

function onDelete(row: CostTableTemplate) {
  const name = row.name.startsWith('page.') ? $t(row.name) : row.name;
  Modal.confirm({
    content: $t('page.costLibrary.template.confirmDelete', [name]),
    onOk: async () => {
      await deleteCostTableTemplate(row.id);
      message.success($t('ui.actionMessage.deleteSuccess', [name]));
      gridApi.query();
    },
    title: $t('common.prompt'),
  });
}

async function onSetDefault(row: CostTableTemplate) {
  await setDefaultCostTableTemplate(row.id);
  saveTemplateId(activeMode.value, row.id);
  activeTemplateId.value = row.id;
  message.success($t('ui.actionMessage.operationSuccess'));
  gridApi.query();
}

function isTemplateInUse(row: CostTableTemplate) {
  return row.isDefault || row.id === activeTemplateId.value;
}

function onActionClick({ code, row }: OnActionClickParams<CostTableTemplate>) {
  if (code === 'edit') {
    onEdit(row);
  }
  if (code === 'delete') {
    onDelete(row);
  }
  if (code === 'set-default') {
    onSetDefault(row);
  }
}

function rowClassName({ row }: { row: CostTableTemplate }) {
  if (isTemplateInUse(row)) {
    return 'row--in-use';
  }
  return '';
}

const searchFormOptions = useI18nFormOptions(() => ({
  collapsed: false,
  schema: buildTemplateSearchSchema(canViewInternalCodes.value),
  showCollapseButton: false,
  submitOnChange: true,
}));

const [Grid, gridApi] = useVbenVxeGrid({
  formOptions: searchFormOptions.value,
  gridOptions: {
    columns: buildColumns(),
    height: 'auto',
    pagerConfig: { enabled: false },
    proxyConfig: {
      ajax: {
        query: async (_ctx, formValues) => {
          const list = await listCostTableTemplates(activeMode.value);
          syncActiveTemplateId(list);
          const items = filterTemplates(list, formValues);
          return { items, total: items.length };
        },
      },
    },
    rowClassName,
    rowConfig: {
      isHover: true,
      keyField: 'id',
    },
    toolbarConfig: {
      refresh: true,
      search: true,
      zoom: true,
    },
  } as VxeTableGridOptions<CostTableTemplate>,
});

watch(
  () => route.path,
  () => {
    gridApi.setGridOptions({ columns: buildColumns() });
    gridApi.query();
  },
);

watch([canEdit, canDelete, canViewInternalCodes], () => {
  gridApi.setGridOptions({ columns: buildColumns() });
});

onActivated(() => {
  gridApi.query();
});
</script>

<template>
  <Page auto-content-height :description="pageDesc" :title="pageTitle">
    <Grid class="template-grid" :form-options="searchFormOptions">
      <template #toolbar-tools>
        <Button v-if="canEdit" type="primary" @click="onCreate">
          <Plus class="size-4" />
          {{ $t('page.costLibrary.template.createTitle') }}
        </Button>
      </template>
      <template v-if="canViewInternalCodes" #code="{ row }">
        <span class="tpl-code">{{ row.code }}</span>
      </template>
      <template #inUse="{ row }">
        <Tag v-if="isTemplateInUse(row)" class="m-0" color="processing">
          {{ $t('page.costLibrary.template.inUseTag') }}
        </Tag>
        <span v-else class="text-muted-foreground">—</span>
      </template>
    </Grid>
  </Page>
</template>
