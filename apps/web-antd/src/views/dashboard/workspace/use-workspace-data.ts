import type {
  WorkspaceMetricView,
  WorkspaceNoticeView,
  WorkspacePipelineView,
  WorkspaceRouteView,
  WorkspaceTodoView,
} from './map-workspace';

import { onMounted, ref } from 'vue';

import { getWorkspaceData } from '#/api/dashboard';

import {
  mapWorkspaceMetrics,
  mapWorkspaceNotice,
  mapWorkspacePipeline,
  mapWorkspaceRoutes,
  mapWorkspaceTodos,
} from './map-workspace';

export function useWorkspaceData() {
  const loading = ref(false);
  const metrics = ref<WorkspaceMetricView[]>([]);
  const todos = ref<WorkspaceTodoView[]>([]);
  const pipeline = ref<WorkspacePipelineView[]>([]);
  const notices = ref<WorkspaceNoticeView[]>([]);
  const topRoutes = ref<WorkspaceRouteView[]>([]);

  async function load() {
    loading.value = true;
    try {
      const data = await getWorkspaceData();
      metrics.value = mapWorkspaceMetrics(data.metrics ?? []);
      todos.value = mapWorkspaceTodos(data.todos ?? []);
      pipeline.value = mapWorkspacePipeline(data.pipeline ?? []);
      notices.value = (data.notices ?? []).map(mapWorkspaceNotice);
      topRoutes.value = mapWorkspaceRoutes(data.topRoutes ?? []);
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
    notices,
    pipeline,
    todos,
    topRoutes,
  };
}
