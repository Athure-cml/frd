<script lang="ts" setup>
import { IconifyIcon } from '@vben/icons';

import { Tooltip } from 'ant-design-vue';

import { $t } from '#/locales';

withDefaults(
  defineProps<{
    count?: number;
  }>(),
  {
    count: 0,
  },
);

const emit = defineEmits<{
  click: [];
}>();
</script>

<template>
  <Tooltip :title="$t('page.workspace.todos.title')">
    <button
      type="button"
      class="todo-trigger"
      :aria-label="$t('page.workspace.todos.title')"
      @click="emit('click')"
    >
      <span v-if="count > 0" class="todo-trigger__badge">
        {{ count > 99 ? '99+' : count }}
      </span>
      <IconifyIcon icon="lucide:list-todo" class="size-4" />
    </button>
  </Tooltip>
</template>

<style scoped>
.todo-trigger {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  margin-right: 4px;
  color: hsl(var(--foreground));
  cursor: pointer;
  background: transparent;
  border: 0;
  border-radius: 8px;
}

.todo-trigger:hover {
  background: hsl(var(--accent));
}

.todo-trigger__badge {
  position: absolute;
  top: 2px;
  right: 2px;
  z-index: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  font-size: 10px;
  font-weight: 600;
  line-height: 1;
  color: #fff;
  background: #fa5151;
  border-radius: 999px;
}
</style>
