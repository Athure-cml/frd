import type {
  WorkspaceMetricView,
  WorkspacePipelineView,
  WorkspaceQuoteStatsView,
  WorkspaceRouteView,
  WorkspaceTodoView,
} from './map-workspace';

import { onMounted, ref } from 'vue';

import { getWorkspaceData } from '#/api/dashboard';

import {
  mapWorkspaceMetrics,
  mapWorkspacePipeline,
  mapWorkspaceQuoteStats,
  mapWorkspaceRoutes,
  mapWorkspaceTodos,
} from './map-workspace';

export function useWorkspaceData() {
  const loading = ref(false);
  const metrics = ref<WorkspaceMetricView[]>([]);
  const todos = ref<WorkspaceTodoView[]>([]);
  const pipeline = ref<WorkspacePipelineView[]>([]);
  const topRoutes = ref<WorkspaceRouteView[]>([]);
  const quoteStats = ref<WorkspaceQuoteStatsView>({
    months: [],
    quoted: [],
    won: [],
  });

  async function load() {
    loading.value = true;
    try {
      const data = await getWorkspaceData();
      metrics.value = mapWorkspaceMetrics(data.metrics ?? []);
      todos.value = mapWorkspaceTodos(data.todos ?? []);
      pipeline.value = mapWorkspacePipeline(data.pipeline ?? []);
      topRoutes.value = mapWorkspaceRoutes(data.topRoutes ?? []);
      quoteStats.value = mapWorkspaceQuoteStats(data.quoteStats);
    } finally {
      loading.value = false;
    }
  }

  onMounted(() => {
    load().catch(() => undefined);
  });

  return {
    loading,
    load,
    metrics,
    pipeline,
    quoteStats,
    todos,
    topRoutes,
  };
}
