<script lang="ts" setup>
import type { TodoDrawerFilter } from './use-todo-drawer';

import type { WorkspaceTodoView } from '#/views/dashboard/workspace/map-workspace';

import { computed } from 'vue';

import { IconifyIcon } from '@vben/icons';

import { Drawer, Spin } from 'ant-design-vue';

import { $t } from '#/locales';
import { WORKSPACE_ILLUSTRATIONS } from '#/views/dashboard/workspace/illustrations';

const props = withDefaults(
  defineProps<{
    filter?: TodoDrawerFilter;
    items?: WorkspaceTodoView[];
    loading?: boolean;
    pendingCount?: number;
  }>(),
  {
    filter: 'all',
    items: () => [],
    loading: false,
    pendingCount: 0,
  },
);

const emit = defineEmits<{
  itemClick: [WorkspaceTodoView];
  'update:filter': [TodoDrawerFilter];
}>();

const open = defineModel<boolean>('open', { default: false });

const tabs = computed(() => [
  { key: 'all' as const, label: $t('page.workspace.todos.filters.all') },
  {
    key: 'urgent' as const,
    label: $t('page.workspace.todos.filters.urgent'),
  },
  {
    key: 'approveQuote' as const,
    label: $t('page.workspace.todos.filters.approve'),
  },
  {
    key: 'followSent' as const,
    label: $t('page.workspace.todos.filters.follow'),
  },
  {
    key: 'reviewCostRisk' as const,
    label: $t('page.workspace.todos.filters.costRisk'),
  },
]);

const priorityClass: Record<WorkspaceTodoView['priority'], string> = {
  high: 'todo-drawer__priority--high',
  medium: 'todo-drawer__priority--medium',
  urgent: 'todo-drawer__priority--urgent',
};

function close() {
  open.value = false;
}

function setFilter(key: TodoDrawerFilter) {
  emit('update:filter', key);
}

function onItemClick(item: WorkspaceTodoView) {
  emit('itemClick', item);
  close();
}
</script>

<template>
  <Drawer
    v-model:open="open"
    root-class-name="todo-drawer-root"
    class="todo-drawer-root"
    :closable="false"
    :title="null"
    placement="right"
    :width="460"
    :body-style="{
      padding: 0,
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
    }"
    destroy-on-close
  >
    <div class="todo-drawer">
      <header class="todo-drawer__header">
        <div class="todo-drawer__header-main">
          <span class="todo-drawer__icon-wrap" aria-hidden="true">
            <IconifyIcon icon="lucide:list-todo" class="size-5" />
          </span>
          <div class="todo-drawer__heading">
            <h3 class="todo-drawer__title">
              {{ $t('page.workspace.todos.title') }}
            </h3>
            <p class="todo-drawer__subtitle">
              {{ $t('page.workspace.todos.pendingHint', [props.pendingCount]) }}
            </p>
          </div>
          <button
            type="button"
            class="todo-drawer__close"
            aria-label="关闭"
            @click="close"
          >
            <IconifyIcon icon="lucide:x" class="size-4" />
          </button>
        </div>

        <div class="todo-drawer__tabs" role="tablist">
          <button
            v-for="tab in tabs"
            :key="tab.key"
            type="button"
            class="todo-drawer__tab"
            :class="{ 'todo-drawer__tab--active': filter === tab.key }"
            role="tab"
            :aria-selected="filter === tab.key"
            @click="setFilter(tab.key)"
          >
            {{ tab.label }}
          </button>
        </div>
      </header>

      <div class="todo-drawer__body">
        <div v-if="loading && items.length === 0" class="todo-drawer__loading">
          <Spin />
        </div>

        <div v-else-if="items.length === 0" class="todo-drawer__empty">
          <img
            :src="WORKSPACE_ILLUSTRATIONS.emptyTodos"
            alt=""
            class="todo-drawer__empty-img"
          />
          <p class="todo-drawer__empty-text">
            {{ $t('page.workspace.todos.empty') }}
          </p>
        </div>

        <ul v-else class="todo-drawer__list">
          <li
            v-for="item in items"
            :key="item.id"
            class="todo-drawer__item"
            :class="{
              'todo-drawer__item--done': item.done,
              'todo-drawer__item--urgent': item.priority === 'urgent',
            }"
            @click="onItemClick(item)"
          >
            <span
              class="todo-drawer__rail"
              :class="priorityClass[item.priority]"
            ></span>
            <div class="todo-drawer__content">
              <div class="todo-drawer__row">
                <p class="todo-drawer__name">{{ item.title }}</p>
                <span
                  class="todo-drawer__priority"
                  :class="priorityClass[item.priority]"
                >
                  {{ $t(`page.workspace.todos.priority.${item.priority}`) }}
                </span>
              </div>
              <p class="todo-drawer__meta">
                {{ item.quoteNo }} · {{ item.customer }}
              </p>
              <div class="todo-drawer__foot">
                <time class="todo-drawer__time">{{ item.time }}</time>
                <span class="todo-drawer__action">{{ item.actionLabel }}</span>
              </div>
            </div>
          </li>
        </ul>
      </div>
    </div>
  </Drawer>
</template>

<style scoped>
.todo-drawer {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #f7f8fa;
}

:global(html.dark) .todo-drawer {
  background: hsl(var(--background));
}

.todo-drawer__header {
  flex-shrink: 0;
  padding: 14px 16px 12px;
  background: #fff;
  border-bottom: 1px solid #eceef1;
}

:global(html.dark) .todo-drawer__header {
  background: hsl(var(--card));
  border-bottom-color: hsl(var(--border));
}

.todo-drawer__header-main {
  display: flex;
  gap: 10px;
  align-items: flex-start;
}

.todo-drawer__icon-wrap {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  color: #3370ff;
  background: #e8f0ff;
  border-radius: 10px;
}

:global(html.dark) .todo-drawer__icon-wrap {
  color: hsl(var(--primary));
  background: hsl(var(--accent));
}

.todo-drawer__heading {
  flex: 1;
  min-width: 0;
}

.todo-drawer__title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  line-height: 1.3;
  color: #1f2329;
}

:global(html.dark) .todo-drawer__title {
  color: hsl(var(--foreground));
}

.todo-drawer__subtitle {
  margin: 2px 0 0;
  font-size: 12px;
  line-height: 1.4;
  color: #8f959e;
}

.todo-drawer__close {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  margin-top: 2px;
  color: #8f959e;
  cursor: pointer;
  background: transparent;
  border: 0;
  border-radius: 6px;
}

.todo-drawer__close:hover {
  color: #1f2329;
  background: #f2f3f5;
}

:global(html.dark) .todo-drawer__close:hover {
  color: hsl(var(--foreground));
  background: hsl(var(--accent));
}

.todo-drawer__tabs {
  display: flex;
  gap: 6px;
  align-items: center;
  margin-top: 12px;
  overflow-x: auto;
}

.todo-drawer__tab {
  flex-shrink: 0;
  padding: 4px 10px;
  font-size: 12px;
  line-height: 1.4;
  color: #646a73;
  cursor: pointer;
  background: #f2f3f5;
  border: 0;
  border-radius: 999px;
}

.todo-drawer__tab:hover {
  color: #3370ff;
}

.todo-drawer__tab--active {
  color: #fff;
  background: #3370ff;
}

.todo-drawer__tab--active:hover {
  color: #fff;
}

:global(html.dark) .todo-drawer__tab {
  color: hsl(var(--muted-foreground));
  background: hsl(var(--muted));
}

:global(html.dark) .todo-drawer__tab--active {
  color: #fff;
  background: hsl(var(--primary));
}

.todo-drawer__body {
  flex: 1;
  min-height: 0;
  overflow: auto;
}

.todo-drawer__loading,
.todo-drawer__empty {
  display: flex;
  flex-direction: column;
  gap: 10px;
  align-items: center;
  justify-content: center;
  min-height: 240px;
  padding: 32px 16px;
  text-align: center;
}

.todo-drawer__empty-img {
  display: block;
  width: 128px;
  height: 128px;
  object-fit: cover;
  object-position: center;
  background: #fff;
  border-radius: 16px;
}

.todo-drawer__empty-text {
  max-width: 28ch;
  margin: 0;
  font-size: 13px;
  line-height: 1.5;
  color: #8f959e;
}

.todo-drawer__list {
  padding: 10px 12px 16px;
  margin: 0;
  list-style: none;
}

.todo-drawer__item {
  position: relative;
  display: flex;
  gap: 0;
  margin-bottom: 8px;
  overflow: hidden;
  cursor: pointer;
  background: #fff;
  border: 1px solid #eef0f3;
  border-radius: 12px;
  transition:
    border-color 0.15s ease,
    box-shadow 0.15s ease;
}

.todo-drawer__item:hover {
  border-color: #d6e0ff;
  box-shadow: 0 4px 14px rgb(51 112 255 / 8%);
}

.todo-drawer__item--urgent {
  background: rgb(250 81 81 / 6%);
  border-color: rgb(250 81 81 / 12%);
}

.todo-drawer__item--urgent:hover {
  border-color: rgb(250 81 81 / 22%);
  box-shadow: 0 4px 14px rgb(250 81 81 / 8%);
}

:global(html.dark) .todo-drawer__item {
  background: hsl(var(--card));
  border-color: hsl(var(--border));
}

:global(html.dark) .todo-drawer__item--urgent {
  background: rgb(250 81 81 / 10%);
  border-color: rgb(250 81 81 / 18%);
}

.todo-drawer__item--done {
  opacity: 0.62;
}

.todo-drawer__rail {
  flex-shrink: 0;
  width: 4px;
  background: #c0c4cc;
}

.todo-drawer__rail.todo-drawer__priority--urgent {
  background: #fa5151;
}

.todo-drawer__rail.todo-drawer__priority--high {
  background: #ff8f1f;
}

.todo-drawer__rail.todo-drawer__priority--medium {
  background: #3370ff;
}

.todo-drawer__content {
  flex: 1;
  min-width: 0;
  padding: 12px 14px;
}

.todo-drawer__row {
  display: flex;
  gap: 8px;
  align-items: flex-start;
  justify-content: space-between;
}

.todo-drawer__name {
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 14px;
  font-weight: 600;
  line-height: 1.4;
  color: #1f2329;
  white-space: nowrap;
}

:global(html.dark) .todo-drawer__name {
  color: hsl(var(--foreground));
}

.todo-drawer__priority {
  flex-shrink: 0;
  padding: 1px 6px;
  font-size: 11px;
  line-height: 1.4;
  border-radius: 4px;
}

.todo-drawer__priority--urgent {
  color: #fa5151;
  background: #ffece8;
}

.todo-drawer__priority--high {
  color: #ff8f1f;
  background: #fff3e8;
}

.todo-drawer__priority--medium {
  color: #3370ff;
  background: #e8f0ff;
}

.todo-drawer__meta {
  margin: 4px 0 0;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 12px;
  line-height: 1.4;
  color: #8f959e;
  white-space: nowrap;
}

.todo-drawer__foot {
  display: flex;
  gap: 8px;
  align-items: center;
  justify-content: space-between;
  margin-top: 8px;
}

.todo-drawer__time {
  font-size: 12px;
  color: #b0b3b8;
}

.todo-drawer__action {
  font-size: 12px;
  font-weight: 500;
  color: #3370ff;
}
</style>

<style>
.todo-drawer-root .ant-drawer-header {
  display: none !important;
}

.todo-drawer-root .ant-drawer-body {
  height: 100%;
  padding: 0 !important;
}
</style>
