<script lang="ts" setup>
import type { WorkspaceNotice } from './workspace-mock';

import { IconifyIcon } from '@vben/icons';

import { $t } from '#/locales';

import WorkspaceCard from './workspace-card.vue';

defineProps<{
  items: WorkspaceNotice[];
}>();

const emit = defineEmits<{
  viewAll: [];
}>();
</script>

<template>
  <WorkspaceCard
    :action-label="$t('page.workspace.viewAll')"
    :show-action="true"
    :title="$t('page.workspace.notices.title')"
    @action="emit('viewAll')"
  >
    <ul class="workspace-notice-list">
      <li v-for="item in items" :key="item.id" class="workspace-notice-item">
        <span class="workspace-notice-icon" aria-hidden="true">
          <IconifyIcon :icon="item.icon" class="size-4" />
        </span>
        <div class="workspace-notice-body">
          <p class="workspace-notice-title">{{ item.title }}</p>
          <p class="workspace-notice-desc">{{ item.desc }}</p>
        </div>
        <span class="workspace-notice-time">{{ item.time }}</span>
      </li>
    </ul>
  </WorkspaceCard>
</template>
