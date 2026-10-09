import type { WorkspaceRouteView } from '#/views/dashboard/workspace/map-workspace';

import { ref } from 'vue';

import { getDashboardTopRoutes } from '#/api/dashboard';
import { mapWorkspaceRoutes } from '#/views/dashboard/workspace/map-workspace';

const open = ref(false);
const loading = ref(false);
const items = ref<WorkspaceRouteView[]>([]);
let loadedOnce = false;

async function loadRoutes(force = false) {
  if (loading.value) {
    return;
  }
  if (loadedOnce && !force) {
    return;
  }
  loading.value = true;
  try {
    const data = await getDashboardTopRoutes();
    items.value = mapWorkspaceRoutes(data ?? []);
    loadedOnce = true;
  } catch {
    if (!loadedOnce) {
      items.value = [];
    }
  } finally {
    loading.value = false;
  }
}

function openRoutesDrawer() {
  open.value = true;
  void loadRoutes(true);
}

function closeRoutesDrawer() {
  open.value = false;
}

function resetRoutesDrawer() {
  open.value = false;
  items.value = [];
  loadedOnce = false;
}

export function useRoutesDrawer() {
  return {
    closeRoutesDrawer,
    items,
    loadRoutes,
    loading,
    open,
    openRoutesDrawer,
    resetRoutesDrawer,
  };
}
