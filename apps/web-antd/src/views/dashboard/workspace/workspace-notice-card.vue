<script lang="ts" setup>
import type { NotificationItem } from '@vben/layouts';

import { IconifyIcon } from '@vben/icons';

import { Tooltip } from 'ant-design-vue';

import { $t } from '#/locales';

import WorkspaceCard from './workspace-card.vue';
import WorkspaceEmpty from './workspace-empty.vue';

defineProps<{
  avatarSrc?: string;
  items: NotificationItem[];
  loading?: boolean;
}>();

const emit = defineEmits<{
  noticeClick: [item: NotificationItem];
  read: [item: NotificationItem];
  remove: [item: NotificationItem];
  viewAll: [];
}>();
</script>

<template>
  <WorkspaceCard
    :action-label="$t('page.workspace.viewAll')"
    :show-action="true"
    :title="$t('page.notifications.title')"
    @action="emit('viewAll')"
  >
    <ul v-if="items.length > 0" class="workspace-notice-list">
      <li
        v-for="item in items"
        :key="item.id ?? item.title"
        class="workspace-notice-item"
        :class="{ 'workspace-notice-item--unread': !item.isRead }"
        role="button"
        tabindex="0"
        @click="emit('noticeClick', item)"
        @keydown.enter="emit('noticeClick', item)"
      >
        <span class="workspace-notice-avatar-wrap" aria-hidden="true">
          <span class="workspace-notice-avatar">
            <img :src="item.avatar || avatarSrc" alt="" />
          </span>
          <i v-if="!item.isRead" class="workspace-notice-dot"></i>
        </span>
        <div class="workspace-notice-body">
          <div class="workspace-notice-row">
            <p class="workspace-notice-title">{{ item.title }}</p>
            <span class="workspace-notice-time">{{ item.date }}</span>
          </div>
          <p class="workspace-notice-desc">{{ item.message }}</p>
        </div>
        <div class="workspace-notice-ops" @click.stop>
          <Tooltip
            v-if="!item.isRead"
            :title="$t('page.notifications.markRead')"
          >
            <button
              type="button"
              class="workspace-notice-icon-btn"
              :disabled="loading"
              @click="emit('read', item)"
            >
              <IconifyIcon icon="lucide:check" class="size-3.5" />
            </button>
          </Tooltip>
          <Tooltip :title="$t('common.delete')">
            <button
              type="button"
              class="workspace-notice-icon-btn workspace-notice-icon-btn--danger"
              :disabled="loading"
              @click="emit('remove', item)"
            >
              <IconifyIcon icon="lucide:x" class="size-3.5" />
            </button>
          </Tooltip>
        </div>
      </li>
    </ul>
    <WorkspaceEmpty
      v-else
      illustration="emptyNotices"
      :description="$t('page.notifications.empty')"
    />
  </WorkspaceCard>
</template>
