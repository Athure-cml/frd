<script lang="ts" setup>
import type {
  CostMode,
  CostTableTemplate,
  CostTableTemplateLayout,
} from '#/api/cost';

import { computed, nextTick, watch } from 'vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { $t } from '#/locales';

import { buildColumnsFromTemplate } from '../../shared/build-columns';
import { getTemplatePreviewRows } from '../template-preview-data';

const props = defineProps<{
  layout: CostTableTemplateLayout;
  mode: CostMode;
}>();

const previewTemplate = computed<CostTableTemplate>(() => ({
  code: 'preview',
  id: 0,
  isDefault: false,
  layout: props.layout,
  mode: props.mode,
  name: 'preview',
}));

const previewData = computed(() => {
  const rows = getTemplatePreviewRows(props.mode);
  const customFields = props.layout.customFields ?? [];
  if (customFields.length === 0) {
    return rows;
  }
  return rows.map((row, rowIndex) => {
    const extraFields = {
      ...row.extraFields,
    };
    customFields.forEach((def) => {
      if (extraFields[def.field] === undefined) {
        extraFields[def.field] = rowIndex === 0 ? def.title : '—';
      }
    });
    return { ...row, extraFields };
  });
});

function buildPreviewColumns() {
  return buildColumnsFromTemplate({
    canEdit: false,
    includeOperation: false,
    mode: props.mode,
    nameField:
      props.mode === 'road'
        ? 'supplier'
        : props.mode === 'fumigation'
          ? 'port'
          : 'origin',
    nameTitle: $t('page.costLibrary.template.previewTable'),
    onActionClick: () => {},
    seqWidth: 48,
    template: previewTemplate.value,
  });
}

const previewColumns = computed(() => buildPreviewColumns());

const [Grid, gridApi] = useVbenVxeGrid({
  gridClass:
    props.mode === 'fumigation'
      ? 'tpl-preview-grid fumigation-cost-grid cost-library-grid'
      : 'tpl-preview-grid cost-library-grid',
  gridOptions: {
    border: true,
    columnConfig: {
      resizable: true,
    },
    columns: previewColumns.value,
    data: previewData.value,
    height: '100%',
    minHeight: 0,
    pagerConfig: {
      enabled: false,
    },
    proxyConfig: {
      enabled: false,
    },
    rowConfig: {
      isHover: true,
      keyField: 'id',
    },
    scrollX: {
      enabled: true,
    },
    scrollY: {
      enabled: true,
      gt: 0,
    },
    showOverflow: true,
    stripe: true,
    toolbarConfig: {
      enabled: false,
    },
  },
});

watch(
  () => props.layout,
  async () => {
    const columns = buildPreviewColumns();
    gridApi.setGridOptions({ columns });
    await nextTick();
    const $grid = gridApi.grid as {
      loadColumn?: (cols: typeof columns) => void;
    };
    $grid?.loadColumn?.(columns);
  },
  { deep: true },
);

watch(previewData, (data) => {
  gridApi.setGridOptions({ data });
});
</script>

<template>
  <div class="tpl-preview">
    <div class="tpl-preview__head">
      <h3 class="tpl-preview__title">
        {{ $t('page.costLibrary.template.livePreview') }}
      </h3>
      <span class="tpl-preview__hint">
        {{ $t('page.costLibrary.template.livePreviewHint') }}
      </span>
    </div>
    <div class="tpl-preview__table">
      <Grid />
    </div>
  </div>
</template>
