<script lang="ts" setup>
import type { NotificationItem } from '@vben/layouts';

import { computed, ref, watch } from 'vue';
import { useRouter } from 'vue-router';

import { AuthenticationLoginExpiredModal } from '@vben/common-ui';
import { useWatermark } from '@vben/hooks';
import {
  BasicLayout,
  LockScreen,
  Notification,
  UserDropdown,
} from '@vben/layouts';
import { preferences, usePreferences } from '@vben/preferences';
import { useAccessStore, useUserStore } from '@vben/stores';

import { message } from 'ant-design-vue';

import {
  dismissAllDashboardNotifications,
  dismissDashboardNotification,
  getDashboardNotifications,
  markAllDashboardNotificationsRead,
  markDashboardNotificationRead,
} from '#/api/dashboard';
import ActivityTickerBar from '#/components/activity-ticker/activity-ticker-bar.vue';
import { useActivityTicker } from '#/components/activity-ticker/use-activity-ticker';
import AiAssistantFab from '#/components/ai-assistant/ai-assistant-fab.vue';
import SystemAnnouncementHost from '#/components/system-announcement/announcement-host.vue';
import { FRD_QUOTE_LOGO_SRC } from '#/constants/brand';
import { $t } from '#/locales';
import { useAuthStore } from '#/store';
import LoginForm from '#/views/_core/authentication/login.vue';
import { resolveAvatarUrl } from '#/views/_core/profile/profile-utils';
import { WORKSPACE_ILLUSTRATIONS } from '#/views/dashboard/workspace/illustrations';
import { mapDashboardNotification } from '#/views/dashboard/workspace/map-workspace';

import NotificationDrawer from './notification-drawer.vue';
import TodoDrawer from './todo-drawer.vue';
import TodoTrigger from './todo-trigger.vue';
import { useTodoDrawer } from './use-todo-drawer';

const notifications = ref<NotificationItem[]>([]);
const noticeDrawerOpen = ref(false);
const noticeActing = ref(false);
const NOTICE_AVATAR = FRD_QUOTE_LOGO_SRC;

const {
  filter: todoFilter,
  filteredItems: todoFilteredItems,
  loadTodos,
  loading: todoLoading,
  open: todoDrawerOpen,
  openTodoDrawer,
  pendingCount: todoPendingCount,
  resetTodoDrawer,
} = useTodoDrawer();

const router = useRouter();
const userStore = useUserStore();
const authStore = useAuthStore();
const accessStore = useAccessStore();
const { destroyWatermark, updateWatermark } = useWatermark();
const { isDark } = usePreferences();
const showDot = computed(() =>
  notifications.value.some((item) => !item.isRead),
);
const unreadNoticeCount = computed(
  () => notifications.value.filter((item) => !item.isRead).length,
);

const showActivityTicker = computed(
  () =>
    !!accessStore.accessToken && preferences.widget.activityTicker !== false,
);

const { items: activityTickerItems } = useActivityTicker(
  () => showActivityTicker.value,
);

const hasActivityTickerItems = computed(
  () => activityTickerItems.value.length > 0,
);

const menus = computed(() => [
  {
    handler: () => {
      router.push({ name: 'Profile' });
    },
    icon: 'lucide:user',
    text: $t('page.auth.profile'),
  },
]);

const avatar = computed(() =>
  resolveAvatarUrl(userStore.userInfo?.avatar, preferences.app.defaultAvatar),
);

async function handleLogout() {
  await authStore.logout(false);
}

async function loadNotifications() {
  if (!accessStore.accessToken) {
    notifications.value = [];
    return;
  }
  try {
    const items = await getDashboardNotifications();
    notifications.value = items.map((item) => ({
      ...mapDashboardNotification(item),
      avatar: NOTICE_AVATAR,
    }));
  } catch {
    notifications.value = [];
  }
}

async function handleNoticeClear() {
  if (noticeActing.value) {
    return;
  }
  noticeActing.value = true;
  try {
    await dismissAllDashboardNotifications();
    notifications.value = [];
  } catch {
    message.error($t('page.notifications.actionFailed'));
  } finally {
    noticeActing.value = false;
  }
}

async function markRead(item: NotificationItem) {
  if (!item.id || noticeActing.value) {
    return;
  }
  noticeActing.value = true;
  try {
    await markDashboardNotificationRead(String(item.id));
    item.isRead = true;
  } catch {
    message.error($t('page.notifications.actionFailed'));
  } finally {
    noticeActing.value = false;
  }
}

async function remove(item: NotificationItem) {
  if (!item.id || noticeActing.value) {
    return;
  }
  noticeActing.value = true;
  try {
    await dismissDashboardNotification(String(item.id));
    notifications.value = notifications.value.filter(
      (row) => row.id !== item.id,
    );
  } catch {
    message.error($t('page.notifications.actionFailed'));
  } finally {
    noticeActing.value = false;
  }
}

async function handleMakeAll() {
  if (noticeActing.value) {
    return;
  }
  noticeActing.value = true;
  try {
    await markAllDashboardNotificationsRead();
    notifications.value.forEach((item) => {
      item.isRead = true;
    });
  } catch {
    message.error($t('page.notifications.actionFailed'));
  } finally {
    noticeActing.value = false;
  }
}

function handleViewAll() {
  noticeDrawerOpen.value = true;
}

function handleTodoItemClick(item: { href: string }) {
  if (item.href) {
    navigateTo(item.href);
  }
  // 办完返回后角标会在下次打开/登录时刷新；离开业务页时再拉一次
  window.setTimeout(() => {
    void loadTodos(true);
  }, 800);
}

watch(
  () => accessStore.accessToken,
  (token) => {
    if (token) {
      loadNotifications().catch(() => undefined);
      loadTodos(true).catch(() => undefined);
    } else {
      notifications.value = [];
      noticeDrawerOpen.value = false;
      resetTodoDrawer();
    }
  },
  { immediate: true },
);

const handleClick = (item: NotificationItem) => {
  if (!item.isRead && item.id) {
    markRead(item).catch(() => undefined);
  }
  if (item.link) {
    navigateTo(item.link, item.query, item.state);
  }
};

function navigateTo(
  link: string,
  query?: Record<string, any>,
  state?: Record<string, any>,
) {
  if (link.startsWith('http://') || link.startsWith('https://')) {
    window.open(link, '_blank');
  } else {
    router.push({
      path: link,
      query: query || {},
      state,
    });
  }
}

watch(
  () => ({
    enable: preferences.app.watermark,
    content: preferences.app.watermarkContent,
    isDark: isDark.value,
  }),
  async ({ enable, content, isDark: isDarkValue }) => {
    if (enable) {
      const watermarkColor = isDarkValue
        ? 'rgba(255, 255, 255, 0.12)'
        : 'rgba(0, 0, 0, 0.12)';

      await updateWatermark({
        advancedStyle: {
          colorStops: [
            {
              color: watermarkColor,
              offset: 0,
            },
            {
              color: watermarkColor,
              offset: 1,
            },
          ],
          type: 'linear',
        },
        content:
          content ||
          `${userStore.userInfo?.username} - ${userStore.userInfo?.realName}`,
      });
    } else {
      destroyWatermark();
    }
  },
  {
    immediate: true,
  },
);
</script>

<template>
  <BasicLayout @clear-preferences-and-logout="handleLogout">
    <template #user-dropdown>
      <UserDropdown
        :avatar
        :menus
        :text="userStore.userInfo?.realName"
        :description="userStore.userInfo?.username"
        @logout="handleLogout"
        @clear-preferences-and-logout="handleLogout"
      />
    </template>
    <template #notification>
      <TodoTrigger :count="todoPendingCount" @click="openTodoDrawer()" />
      <Notification
        :count="unreadNoticeCount"
        :dot="showDot"
        :empty-image="WORKSPACE_ILLUSTRATIONS.emptyNotices"
        :empty-text="$t('page.notifications.empty')"
        :notifications="notifications"
        :show-view-all="true"
        @clear="handleNoticeClear"
        @read="markRead"
        @remove="remove"
        @make-all="handleMakeAll"
        @on-click="handleClick"
        @view-all="handleViewAll"
      />
      <TodoDrawer
        v-model:open="todoDrawerOpen"
        v-model:filter="todoFilter"
        :items="todoFilteredItems"
        :loading="todoLoading"
        :pending-count="todoPendingCount"
        @item-click="handleTodoItemClick"
      />
      <NotificationDrawer
        v-model:open="noticeDrawerOpen"
        :avatar-src="NOTICE_AVATAR"
        :loading="noticeActing"
        :notifications="notifications"
        @clear="handleNoticeClear"
        @make-all="handleMakeAll"
        @on-click="handleClick"
        @read="markRead"
        @remove="remove"
      />
    </template>
    <template v-if="showActivityTicker && hasActivityTickerItems" #content-top>
      <ActivityTickerBar :items="activityTickerItems" />
    </template>
    <template #extra>
      <AiAssistantFab />
      <SystemAnnouncementHost />
      <AuthenticationLoginExpiredModal
        v-model:open="accessStore.loginExpired"
        :avatar
      >
        <LoginForm />
      </AuthenticationLoginExpiredModal>
    </template>
    <template #lock-screen>
      <LockScreen :avatar @to-login="handleLogout" />
    </template>
  </BasicLayout>
</template>
