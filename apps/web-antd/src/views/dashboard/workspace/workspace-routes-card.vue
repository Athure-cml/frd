<script lang="ts" setup>
import type { WorkspaceRouteItem } from './workspace-mock';

import { IconifyIcon } from '@vben/icons';

import { $t } from '#/locales';

import WorkspaceCard from './workspace-card.vue';

defineProps<{
  items: WorkspaceRouteItem[];
}>();

const emit = defineEmits<{
  viewAll: [];
}>();

const maxValue = (items: WorkspaceRouteItem[]) =>
  Math.max(...items.map((item) => item.value), 1);
</script>

<template>
  <WorkspaceCard
    :action-label="$t('page.workspace.viewAll')"
    :show-action="true"
    :title="$t('page.workspace.topRoutes')"
    @action="emit('viewAll')"
  >
    <ul class="workspace-routes-list">
      <li
        v-for="(item, index) in items"
        :key="item.name"
        class="workspace-routes-item"
      >
        <span class="workspace-routes-rank">{{ index + 1 }}</span>
        <IconifyIcon icon="lucide:route" class="workspace-routes-icon size-4" />
        <div class="workspace-routes-body">
          <span class="workspace-routes-name">{{ item.name }}</span>
          <div class="workspace-routes-bar">
            <span
              class="workspace-routes-fill"
              :style="{ width: `${(item.value / maxValue(items)) * 100}%` }"
            ></span>
          </div>
        </div>
        <span class="workspace-routes-value">{{ item.value }}</span>
      </li>
    </ul>
  </WorkspaceCard>
</template>
