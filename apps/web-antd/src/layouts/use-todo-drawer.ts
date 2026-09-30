import type { WorkspaceTodoView } from '#/views/dashboard/workspace/map-workspace';

import { computed, ref } from 'vue';

import { getDashboardTodos } from '#/api/dashboard';
import { mapWorkspaceTodos } from '#/views/dashboard/workspace/map-workspace';

export type TodoDrawerFilter =
  | 'all'
  | 'approveQuote'
  | 'followSent'
  | 'reviewCostRisk'
  | 'urgent';

const open = ref(false);
const loading = ref(false);
const items = ref<WorkspaceTodoView[]>([]);
const filter = ref<TodoDrawerFilter>('all');
let loadedOnce = false;

const pendingCount = computed(
  () => items.value.filter((item) => !item.done).length,
);

const filteredItems = computed(() => {
  const list = items.value;
  switch (filter.value) {
    case 'approveQuote': {
      return list.filter((item) => item.todoType === 'approveQuote');
    }
    case 'followSent': {
      return list.filter((item) => item.todoType === 'followSent');
    }
    case 'reviewCostRisk': {
      return list.filter((item) => item.todoType === 'reviewCostRisk');
    }
    case 'urgent': {
      return list.filter((item) => item.priority === 'urgent' && !item.done);
    }
    default: {
      return list;
    }
  }
});

async function loadTodos(force = false) {
  if (loading.value) {
    return;
  }
  if (loadedOnce && !force) {
    return;
  }
  loading.value = true;
  try {
    const data = await getDashboardTodos();
    items.value = mapWorkspaceTodos(data ?? []);
    loadedOnce = true;
  } catch {
    if (!loadedOnce) {
      items.value = [];
    }
  } finally {
    loading.value = false;
  }
}

function openTodoDrawer(nextFilter: TodoDrawerFilter = 'all') {
  filter.value = nextFilter;
  open.value = true;
  void loadTodos(true);
}

function closeTodoDrawer() {
  open.value = false;
}

function resetTodoDrawer() {
  open.value = false;
  items.value = [];
  filter.value = 'all';
  loadedOnce = false;
}

export function useTodoDrawer() {
  return {
    closeTodoDrawer,
    filter,
    filteredItems,
    items,
    loadTodos,
    loading,
    open,
    openTodoDrawer,
    pendingCount,
    resetTodoDrawer,
  };
}
