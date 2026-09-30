<script lang="ts" setup>
import type { WorkspaceTodoView } from './map-workspace';

import { $t } from '#/locales';

import WorkspaceCard from './workspace-card.vue';
import WorkspaceEmpty from './workspace-empty.vue';

defineProps<{
  items: WorkspaceTodoView[];
}>();

const emit = defineEmits<{
  itemClick: [href: string];
  viewAll: [];
}>();

const priorityClass: Record<WorkspaceTodoView['priority'], string> = {
  high: 'ws-priority--high',
  medium: 'ws-priority--medium',
  urgent: 'ws-priority--urgent',
};
</script>

<template>
  <WorkspaceCard
    :action-label="$t('page.workspace.viewAll')"
    :show-action="true"
    :title="$t('page.workspace.todos.title')"
    @action="emit('viewAll')"
  >
    <ul v-if="items.length > 0" class="workspace-todo-list">
      <li
        v-for="item in items"
        :key="item.id"
        class="workspace-todo-item"
        :class="[
          `workspace-todo-item--${item.priority}`,
          { 'workspace-todo-item--done': item.done },
        ]"
        role="button"
        tabindex="0"
        @click="emit('itemClick', item.href)"
        @keydown.enter="emit('itemClick', item.href)"
      >
        <div class="workspace-todo-body">
          <p class="workspace-todo-title">{{ item.title }}</p>
          <p class="workspace-todo-meta">
            {{ item.quoteNo }} · {{ item.customer }}
          </p>
        </div>
        <span
          class="workspace-todo-priority"
          :class="priorityClass[item.priority]"
        >
          {{ $t(`page.workspace.todos.priority.${item.priority}`) }}
        </span>
        <span class="workspace-todo-time">{{ item.time }}</span>
      </li>
    </ul>
    <WorkspaceEmpty
      v-else
      illustration="emptyTodos"
      :description="$t('page.workspace.todos.empty')"
    />
  </WorkspaceCard>
</template>
