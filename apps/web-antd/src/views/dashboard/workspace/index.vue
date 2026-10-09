<script lang="ts" setup>
import type { NotificationItem } from '@vben/layouts';

import { computed } from 'vue';
import { useRouter } from 'vue-router';

import { useI18n } from '@vben/locales';
import { useUserStore } from '@vben/stores';

import { useNotificationDrawer } from '#/layouts/use-notification-drawer';
import { useRoutesDrawer } from '#/layouts/use-routes-drawer';
import { useTodoDrawer } from '#/layouts/use-todo-drawer';
import { $t } from '#/locales';

import { formatWorkspaceDate, resolveGreetingKey } from './data';
import { useWorkspaceData } from './use-workspace-data';
import WorkspaceHeader from './workspace-header.vue';
import WorkspaceKpi from './workspace-kpi.vue';
import WorkspaceNoticeCard from './workspace-notice-card.vue';
import WorkspacePipelineCard from './workspace-pipeline-card.vue';
import WorkspaceRoutesCard from './workspace-routes-card.vue';
import WorkspaceTodoCard from './workspace-todo-card.vue';
import WorkspaceTrendCard from './workspace-trend-card.vue';

import './workspace.css';

const userStore = useUserStore();
const router = useRouter();
const { locale } = useI18n();
const { openTodoDrawer } = useTodoDrawer();
const { openRoutesDrawer } = useRoutesDrawer();
const {
  acting: noticeActing,
  avatarSrc: noticeAvatarSrc,
  loadNotifications,
  markRead,
  notifications,
  openNoticeDrawer,
  remove,
} = useNotificationDrawer();

const { metrics, todos, pipeline, topRoutes, quoteStats } = useWorkspaceData();

void loadNotifications(true);

const userName = computed(
  () => userStore.userInfo?.realName || userStore.userInfo?.username || '',
);

const greeting = computed(() => $t(resolveGreetingKey(), [userName.value]));

const dateLabel = computed(() =>
  formatWorkspaceDate(locale.value === 'zh-CN' ? 'zh-CN' : 'en-US'),
);

function navTo(url: string) {
  if (url.startsWith('/')) {
    router.push(url).catch(() => undefined);
  }
}

function handleNoticeClick(item: NotificationItem) {
  if (!item.isRead && item.id) {
    markRead(item).catch(() => undefined);
  }
  if (item.link) {
    navTo(item.link);
  }
}
</script>

<template>
  <div class="dashboard-shell workspace-page">
    <section class="workspace-hero">
      <WorkspaceHeader
        :date-label="dateLabel"
        :greeting="greeting"
        :subtitle="$t('page.workspace.subtitle')"
      />

      <WorkspaceKpi :items="metrics" />
    </section>

    <div class="workspace-body">
      <div class="workspace-mid-grid">
        <WorkspaceTrendCard :stats="quoteStats" />
        <WorkspaceTodoCard
          :items="todos"
          @item-click="navTo"
          @view-all="openTodoDrawer()"
        />
      </div>

      <div class="workspace-bottom-grid">
        <WorkspacePipelineCard
          :items="pipeline"
          @item-click="(id) => navTo(`/quotes/${id}/edit`)"
          @view-all="navTo('/quotes/list')"
        />
        <WorkspaceRoutesCard
          :items="topRoutes"
          @view-all="openRoutesDrawer()"
        />
        <WorkspaceNoticeCard
          :avatar-src="noticeAvatarSrc"
          :items="notifications"
          :loading="noticeActing"
          @notice-click="handleNoticeClick"
          @read="markRead"
          @remove="remove"
          @view-all="openNoticeDrawer()"
        />
      </div>
    </div>
  </div>
</template>
