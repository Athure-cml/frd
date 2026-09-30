import type { Router } from 'vue-router';

import type { CostMode } from '#/api/cost';

import { nextTick, onActivated, onMounted, ref, shallowRef } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { seaCostApi } from '#/api/cost/freight';
import { fumigationCostApi } from '#/api/cost/fumigation';
import { getRoadCost } from '#/api/cost/road';

export const RELATION_FOCUS_ROW_CLASS = 'cost-relation-focus';

const COST_LIBRARY_PATH: Record<CostMode, string> = {
  fumigation: '/cost-library/fumigation',
  road: '/cost-library/road',
  sea: '/cost-library/sea',
};

const QUOTE_LIBRARY_PATH: Record<CostMode, string> = {
  fumigation: '/quotes/library/fumigation',
  road: '/quotes/library/road',
  sea: '/quotes/library/sea',
};

export function navigateToQuoteLibrary(
  router: Router,
  mode: CostMode,
  id: number,
) {
  router.push({
    path: QUOTE_LIBRARY_PATH[mode],
    query: { focusId: String(id) },
  });
}

export function navigateToCostLibrary(
  router: Router,
  mode: CostMode,
  id: number,
) {
  router.push({
    path: COST_LIBRARY_PATH[mode],
    query: { focusId: String(id) },
  });
}

async function fetchCostRecord(mode: CostMode, id: number) {
  if (mode === 'road') {
    return getRoadCost(id);
  }
  if (mode === 'sea') {
    return seaCostApi.get(id);
  }
  return fumigationCostApi.get(id);
}

function pickSearchValues(values: Record<string, unknown>) {
  const next: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined || value === null || value === '') {
      continue;
    }
    next[key] = value;
  }
  return next;
}

function buildFocusSearchValues(
  mode: CostMode,
  record: Record<string, unknown>,
) {
  if (mode === 'road') {
    return pickSearchValues({
      city: record.city,
      state: record.state,
      zipCode: record.zipCode,
    });
  }
  if (mode === 'sea') {
    return pickSearchValues({
      pod: record.pod,
      pol: record.pol,
      por: record.por,
    });
  }
  return pickSearchValues({
    region: record.region ?? record.port,
    station: record.station,
  });
}

type RelationFocusGridApi = {
  formApi?: {
    setValues?: (values: Record<string, unknown>) => Promise<void> | void;
  };
  grid?: {
    $el?: HTMLElement;
    scrollToRow?: (row: { id?: number }) => void;
  };
  query?: () => Promise<void> | void;
};

export function useRelationFocus(options: {
  getPageRows: () => Array<{ id?: number }>;
  gridApi: () => RelationFocusGridApi;
  mode: CostMode;
}) {
  const route = useRoute();
  const router = useRouter();
  const focusRowId = ref<null | number>(null);
  const focusing = shallowRef(false);

  function relationFocusRowClass({ row }: { row: { id?: number } }) {
    if (focusRowId.value !== null && row.id === focusRowId.value) {
      return RELATION_FOCUS_ROW_CLASS;
    }
    return '';
  }

  function clearFocusQuery() {
    if (!route.query.focusId) {
      return;
    }
    const nextQuery = { ...route.query };
    delete nextQuery.focusId;
    router.replace({ query: nextQuery });
  }

  async function applyFocusFromRoute() {
    const raw = route.query.focusId;
    const id = typeof raw === 'string' ? Number(raw) : Number.NaN;
    if (!Number.isFinite(id) || id <= 0) {
      focusRowId.value = null;
      return;
    }
    if (focusing.value || focusRowId.value === id) {
      return;
    }
    focusing.value = true;
    focusRowId.value = id;
    try {
      const record = await fetchCostRecord(options.mode, id);
      const searchValues = buildFocusSearchValues(
        options.mode,
        record as Record<string, unknown>,
      );
      await options.gridApi().formApi?.setValues?.(searchValues);
      await options.gridApi().query?.();
    } catch {
      focusRowId.value = null;
      clearFocusQuery();
    } finally {
      focusing.value = false;
    }
  }

  async function scrollToFocusedRow(rows: Array<{ id?: number }>) {
    const id = focusRowId.value;
    if (id === null) {
      return;
    }
    const targetRow = rows.find((row) => row.id === id);
    if (!targetRow) {
      return;
    }

    await nextTick();
    const grid = options.gridApi().grid;
    grid?.scrollToRow?.(targetRow);

    const gridEl = grid?.$el;
    const rowEl =
      gridEl?.querySelector(`.vxe-body--row[rowid="${id}"]`) ??
      gridEl?.querySelector(`.vxe-body--row[data-rowid="${id}"]`);
    rowEl?.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'nearest',
    });

    window.setTimeout(() => {
      focusRowId.value = null;
      clearFocusQuery();
    }, 4000);
  }

  function onDataRendered(rows?: Array<{ id?: number }>) {
    void scrollToFocusedRow(rows ?? options.getPageRows());
  }

  onMounted(() => {
    void applyFocusFromRoute();
  });

  onActivated(() => {
    void applyFocusFromRoute();
  });

  return {
    applyFocusFromRoute,
    onDataRendered,
    relationFocusRowClass,
  };
}
