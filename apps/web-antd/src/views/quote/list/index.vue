<script lang="ts" setup>
import type {
  OnActionClickParams,
  VxeTableGridOptions,
} from '#/adapter/vxe-table';
import type { QuoteApi } from '#/api/quote';

import { computed, nextTick, onActivated, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { useAccess } from '@vben/access';
import { Page } from '@vben/common-ui';
import { Download } from '@vben/icons';
import { downloadFileFromBlob } from '@vben/utils';

import { Button, message, Modal, Tag } from 'ant-design-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  exportQuotes,
  getQuoteList,
  getQuoteListIds,
  renewQuote,
  voidQuote,
} from '#/api/quote';
import { $t } from '#/locales';

import {
  scheduleGridRecalculate,
  useGridResizeRecalculate,
} from '../../cost-library/shared/schedule-grid-recalculate';
import { buildListExportParams } from '../../shared/export-params';
import { useI18nFormOptions } from '../../shared/use-i18n-form-options';
import {
  consumeQuoteListForceRefresh,
  hasActiveListFilters,
  markQuoteListForceRefresh,
} from '../shared/list-cache';
import { normalizeQuoteListSearchParams } from '../shared/quote-multi-search-params';
import {
  quoteRowClassName,
  resolveQuoteListStatusTag,
  shouldShowQuoteListCostRiskTag,
  useQuoteColumns,
  useQuoteSearchSchema,
} from './data';

import '../shared/quote.css';

defineOptions({ name: 'QuoteList' });

const router = useRouter();
const route = useRoute();
const { hasAccessByCodes } = useAccess();
const canDelete = hasAccessByCodes(['quote:delete']);
const canVoid = hasAccessByCodes(['quote:approve']);
const canCreate = hasAccessByCodes(['quote:create']);
const canExport = hasAccessByCodes(['quote:export']);
const exporting = ref(false);
/** 最近一次列表请求的页码（用于 keepAlive 返回时判断是否需刷新） */
const lastQueryPage = ref(1);

const selectedIds = ref<number[]>([]);
const selectedCount = ref(0);
const selectingAllPages = ref(false);
const crossPageSelectActive = ref(false);
const lastSearchKey = ref('');
let applyingSelection = false;
let lastPageItems: QuoteApi.QuoteListItem[] = [];

const selectedIdSet = computed(() => new Set(selectedIds.value));

/** 报价库反查：/quotes/list?libraryMode=road&libraryCostId=123 */
const libraryFilter = computed(() => {
  const modeRaw = route.query.libraryMode;
  const idRaw = route.query.libraryCostId;
  const libraryMode =
    typeof modeRaw === 'string' &&
    (modeRaw === 'road' || modeRaw === 'sea' || modeRaw === 'fumigation')
      ? modeRaw
      : '';
  const libraryCostId =
    typeof idRaw === 'string' && /^\d+$/.test(idRaw) ? Number(idRaw) : 0;
  if (!libraryMode || libraryCostId <= 0) {
    return null;
  }
  return { libraryCostId, libraryMode };
});

const libraryFilterHint = computed(() => {
  const filter = libraryFilter.value;
  if (!filter) {
    return '';
  }
  const modeLabel = $t(`page.quote.library.${filter.libraryMode}`);
  return $t('page.quote.libraryFilterHint', [modeLabel, filter.libraryCostId]);
});

function clearLibraryFilter() {
  const nextQuery = { ...route.query };
  delete nextQuery.libraryMode;
  delete nextQuery.libraryCostId;
  router.replace({ query: nextQuery }).then(() => {
    void gridApi.query();
  });
}

function canOperateRow(row: QuoteApi.QuoteListItem) {
  return row.operable === true;
}

function syncSelection() {
  selectedCount.value = selectedIds.value.length;
  if (crossPageSelectActive.value && selectedCount.value === 0) {
    crossPageSelectActive.value = false;
  }
}

function clearSelection() {
  selectedIds.value = [];
  crossPageSelectActive.value = false;
  gridApi.grid?.clearCheckboxRow?.();
  syncSelection();
}

function onSearchCriteriaChange() {
  selectedIds.value = [];
  crossPageSelectActive.value = false;
  gridApi.grid?.clearCheckboxRow?.();
  syncSelection();
}

function updateSelectedIds(updater: (current: Set<number>) => void) {
  const next = new Set(selectedIds.value);
  updater(next);
  selectedIds.value = [...next];
  syncSelection();
}

function getCurrentPageRows(): QuoteApi.QuoteListItem[] {
  const $grid = gridApi.grid as null | {
    getTableData?: () => { tableData?: QuoteApi.QuoteListItem[] };
  };
  return $grid?.getTableData?.()?.tableData ?? [];
}

async function applySelectionToRows(rows?: QuoteApi.QuoteListItem[]) {
  applyingSelection = true;
  try {
    await nextTick();
    const $grid = gridApi.grid as null | {
      clearCheckboxRow?: () => void;
      setCheckboxRow?: (
        rows: QuoteApi.QuoteListItem[],
        checked: boolean,
      ) => void;
    };
    if (!$grid) {
      return;
    }
    if (selectedIds.value.length === 0) {
      $grid.clearCheckboxRow?.();
      return;
    }
    const pageRows = rows?.length ? rows : getCurrentPageRows();
    if (pageRows.length === 0) {
      return;
    }
    const active = selectedIdSet.value;
    const toUncheck = pageRows.filter((row) => !active.has(row.id));
    const toCheck = pageRows.filter((row) => active.has(row.id));
    if (toUncheck.length > 0) {
      $grid.setCheckboxRow?.(toUncheck, false);
    }
    if (toCheck.length > 0) {
      $grid.setCheckboxRow?.(toCheck, true);
    }
  } finally {
    applyingSelection = false;
  }
}

function onCheckboxChange(params: {
  checked: boolean;
  row: QuoteApi.QuoteListItem;
}) {
  if (applyingSelection) {
    return;
  }
  const rowId = params.row?.id;
  if (typeof rowId !== 'number') {
    return;
  }
  updateSelectedIds((current) => {
    if (params.checked) {
      current.add(rowId);
    } else {
      current.delete(rowId);
    }
  });
}

function onCheckboxAll(params: { checked: boolean }) {
  if (applyingSelection) {
    return;
  }
  const pageIds = getCurrentPageRows()
    .map((row) => row.id)
    .filter((id): id is number => typeof id === 'number');
  updateSelectedIds((current) => {
    for (const id of pageIds) {
      if (params.checked) {
        current.add(id);
      } else {
        current.delete(id);
      }
    }
  });
}

type PatchedResetFn = (() => Promise<void>) & {
  __quoteSelectionPatched?: boolean;
};

function patchSearchFormReset() {
  const formApi = gridApi.formApi as
    | undefined
    | {
        getState?: () => { handleReset?: PatchedResetFn };
        setState?: (patch: { handleReset: PatchedResetFn }) => void;
      };
  if (!formApi?.getState || !formApi?.setState) {
    return;
  }
  const original = formApi.getState()?.handleReset;
  if (!original || original.__quoteSelectionPatched) {
    return;
  }
  const patched: PatchedResetFn = async () => {
    lastSearchKey.value = '';
    onSearchCriteriaChange();
    await original();
  };
  patched.__quoteSelectionPatched = true;
  formApi.setState({ handleReset: patched });
}

async function buildCurrentSearchParams() {
  const formValues = await gridApi.formApi?.getLatestSubmissionValues?.();
  const normalized = normalizeQuoteListSearchParams({
    ...formValues,
  });
  const filter = libraryFilter.value;
  return {
    ...normalized,
    ...(filter
      ? {
          libraryCostId: filter.libraryCostId,
          libraryMode: filter.libraryMode,
        }
      : {}),
  };
}

async function onSelectAllAcrossPages() {
  if (selectingAllPages.value) {
    return;
  }
  selectingAllPages.value = true;
  const hideLoading = message.loading({
    content: $t('page.quote.hint.selectAllAcrossPagesLoading'),
    duration: 0,
    key: 'quote_select_all_msg',
  });
  try {
    const params = await buildCurrentSearchParams();
    const ids = await getQuoteListIds(params);
    if (ids.length === 0) {
      message.warning({
        content: $t('page.quote.hint.selectAllAcrossPagesEmpty'),
        key: 'quote_select_all_msg',
      });
      return;
    }
    selectedIds.value = ids;
    crossPageSelectActive.value = true;
    await applySelectionToRows(lastPageItems);
    syncSelection();
    message.success({
      content: $t('page.quote.hint.selectAllAcrossPagesSuccess', [ids.length]),
      key: 'quote_select_all_msg',
    });
  } catch {
    hideLoading();
  } finally {
    selectingAllPages.value = false;
  }
}

function onView(row: QuoteApi.QuoteListItem) {
  router.push({ name: 'QuoteEdit', params: { id: row.id } });
}

function onVoid(row: QuoteApi.QuoteListItem) {
  Modal.confirm({
    title: $t('page.quote.actions.void'),
    content: $t('page.quote.confirm.void', [row.quoteNo]),
    okType: 'danger',
    onOk: async () => {
      await voidQuote(row.id);
      markQuoteListForceRefresh('quote');
      markQuoteListForceRefresh('inquiry');
      message.success($t('page.quote.message.voidSuccess'));
      gridApi.query();
    },
  });
}

function onRenew(row: QuoteApi.QuoteListItem) {
  Modal.confirm({
    title: $t('page.quote.actions.renew'),
    content: $t('page.quote.confirm.renew', [row.quoteNo]),
    okText: $t('page.quote.actions.renew'),
    onOk: async () => {
      const hide = message.loading({
        content: $t('page.quote.message.renewing'),
        duration: 0,
        key: 'quote_renew_msg',
      });
      try {
        const created = await renewQuote(row.id);
        markQuoteListForceRefresh('quote');
        markQuoteListForceRefresh('inquiry');
        message.success({
          content: $t('page.quote.message.renewSuccess', [
            created.quoteNo ?? '',
          ]),
          key: 'quote_renew_msg',
        });
        await router.push({
          name: 'QuoteEdit',
          params: { id: String(created.id) },
        });
      } catch {
        hide();
      }
    },
  });
}

function onActionClick({
  code,
  row,
}: OnActionClickParams<QuoteApi.QuoteListItem>) {
  if (code === 'view') {
    onView(row);
    return;
  }
  if (code === 'renew') {
    onRenew(row);
    return;
  }
  if (code === 'void') {
    onVoid(row);
  }
}

async function onBatchExport() {
  exporting.value = true;
  const hideLoading = message.loading({
    content: $t('page.quote.message.exporting'),
    duration: 0,
    key: 'quote_export_msg',
  });
  try {
    const params = await buildCurrentSearchParams();
    const blob = await exportQuotes(
      buildListExportParams(params, selectedIds.value),
    );
    await downloadFileFromBlob({
      fileName: `报价单-${Date.now()}.xlsx`,
      source: blob as Blob,
    });
    message.success({
      content: $t('page.quote.message.exportSuccess'),
      key: 'quote_export_msg',
    });
  } catch {
    hideLoading();
  } finally {
    exporting.value = false;
  }
}

const searchFormOptions = useI18nFormOptions(() => ({
  collapsed: true,
  schema: useQuoteSearchSchema(),
  showCollapseButton: true,
  submitOnChange: false,
}));

const [Grid, gridApi] = useVbenVxeGrid({
  formOptions: searchFormOptions.value,
  gridEvents: {
    checkboxAll: onCheckboxAll,
    checkboxChange: onCheckboxChange,
    dataRendered: () => {
      void applySelectionToRows(lastPageItems);
      syncSelection();
      scheduleGridRecalculate(
        () =>
          gridApi.grid as null | {
            recalculate?: (refull?: boolean) => void;
          },
      );
    },
  },
  gridOptions: {
    id: 'quote-list',
    columns: useQuoteColumns(
      onActionClick,
      canDelete,
      canVoid,
      canOperateRow,
      canCreate,
    ),
    // 勿用 auto：数据加载后表体变高，横向滚动条会被裁掉，直到 resize 才恢复
    height: '100%',
    pagerConfig: {},
    proxyConfig: {
      ajax: {
        query: async ({ page }, formValues) => {
          lastQueryPage.value = page.currentPage || 1;
          const searchKey = JSON.stringify(formValues ?? {});
          if (searchKey !== lastSearchKey.value) {
            onSearchCriteriaChange();
            lastSearchKey.value = searchKey;
          }
          const filter = libraryFilter.value;
          const normalized = normalizeQuoteListSearchParams({
            ...formValues,
          });
          const result = await getQuoteList({
            page: page.currentPage,
            pageSize: page.pageSize,
            ...normalized,
            ...(filter
              ? {
                  libraryCostId: filter.libraryCostId,
                  libraryMode: filter.libraryMode,
                }
              : {}),
          });
          lastPageItems = result.items ?? [];
          return result;
        },
      },
    },
    rowClassName: quoteRowClassName,
    rowConfig: {
      keyField: 'id',
    },
    checkboxConfig: {
      highlight: true,
      reserve: false,
    },
    fit: false,
    scrollbarConfig: {
      x: { visible: 'visible' },
    },
    // vxe 用自定义横条，必须保持 scrollX
    scrollX: { enabled: true },
    toolbarConfig: {
      custom: true,
      refresh: true,
      search: true,
      zoom: true,
    },
  } as VxeTableGridOptions<QuoteApi.QuoteListItem>,
});

const gridHostRef = ref<HTMLElement | null>(null);
useGridResizeRecalculate(
  gridHostRef,
  () =>
    gridApi.grid as null | {
      recalculate?: (refull?: boolean) => void;
    },
);

watch(
  () => [route.query.libraryMode, route.query.libraryCostId],
  () => {
    void gridApi.query();
  },
);

/**
 * keepAlive 返回策略：
 * 1) 详情侧有写操作 → 强制按当前条件刷新（能看见新建/变更）
 * 2) 有搜索条件或非第 1 页 → 保留缓存，不请求
 * 3) 默认空条件第 1 页 → 刷新，避免漏掉新单据
 */
onMounted(() => {
  patchSearchFormReset();
});

onActivated(async () => {
  patchSearchFormReset();
  scheduleGridRecalculate(
    () =>
      gridApi.grid as null | {
        recalculate?: (refull?: boolean) => void;
      },
  );

  const forceRefresh = consumeQuoteListForceRefresh('quote');
  if (forceRefresh) {
    await gridApi.query();
    return;
  }

  const formValues =
    (await gridApi.formApi?.getLatestSubmissionValues?.()) ?? {};
  const keepCache =
    hasActiveListFilters(formValues) ||
    lastQueryPage.value > 1 ||
    !!libraryFilter.value;
  if (!keepCache) {
    await gridApi.query();
  }
});
</script>

<template>
  <Page
    auto-content-height
    :description="$t('page.quote.hint.list')"
    :title="$t('page.quote.list')"
  >
    <div v-if="libraryFilter" class="quote-library-filter-banner">
      <span>{{ libraryFilterHint }}</span>
      <Button size="small" type="link" @click="clearLibraryFilter">
        {{ $t('page.quote.clearLibraryFilter') }}
      </Button>
    </div>
    <div ref="gridHostRef" class="cost-library-grid-host h-full min-h-0">
      <Grid class="quote-grid" :form-options="searchFormOptions">
        <template #toolbar-tools>
          <Tag v-if="selectedCount > 0" class="mr-2" color="processing">
            {{ $t('page.quote.hint.selectedCount', [selectedCount]) }}
          </Tag>
          <Button
            v-if="!crossPageSelectActive"
            class="mr-2"
            :loading="selectingAllPages"
            @click="onSelectAllAcrossPages"
          >
            {{ $t('page.quote.actions.selectAllAcrossPages') }}
          </Button>
          <Button
            v-if="crossPageSelectActive"
            class="mr-2"
            ghost
            type="primary"
            @click="clearSelection"
          >
            {{ $t('page.quote.actions.clearSelection') }}
          </Button>
          <Button
            v-if="canExport"
            class="mr-2"
            :loading="exporting"
            @click="onBatchExport"
          >
            <Download class="size-4" />
            {{ $t('page.quote.actions.export') }}
          </Button>
        </template>
        <template #quoteNo="{ row }">
          <button class="quote-no-link" type="button" @click="onView(row)">
            {{ row.quoteNo }}
          </button>
        </template>
        <template #status="{ row }">
          <span class="quote-list-status-tags">
            <Tag
              :class="resolveQuoteListStatusTag(row).className"
              :color="resolveQuoteListStatusTag(row).color"
            >
              {{ resolveQuoteListStatusTag(row).label }}
            </Tag>
            <Tag v-if="shouldShowQuoteListCostRiskTag(row)" color="error">
              {{ $t('page.quote.risk.tag') }}
            </Tag>
          </span>
        </template>
      </Grid>
    </div>
  </Page>
</template>
