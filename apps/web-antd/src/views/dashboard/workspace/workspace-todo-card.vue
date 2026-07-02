<script lang="ts" setup>
import type { WorkspaceTodo } from './workspace-mock';

import { Checkbox } from 'ant-design-vue';

import { $t } from '#/locales';

import WorkspaceCard from './workspace-card.vue';

defineProps<{
  items: WorkspaceTodo[];
}>();

const emit = defineEmits<{
  itemClick: [id: string];
  viewAll: [];
}>();

const priorityClass: Record<WorkspaceTodo['priority'], string> = {
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
    <ul class="workspace-todo-list">
      <li
        v-for="item in items"
        :key="item.id"
        class="workspace-todo-item"
        :class="{ 'workspace-todo-item--done': item.done }"
        role="button"
        tabindex="0"
        @click="emit('itemClick', item.id)"
        @keydown.enter="emit('itemClick', item.id)"
      >
        <Checkbox
          :checked="item.done"
          class="workspace-todo-check"
          @click.stop
        />
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
  </WorkspaceCard>
</template>
