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
import {
  preferences,
  updatePreferences,
  usePreferences,
} from '@vben/preferences';
import { useAccessStore, useUserStore } from '@vben/stores';

import { getDashboardNotifications } from '#/api/dashboard';
import { FRD_LOGO_SRC, FRD_LOGO_SRC_DARK } from '#/constants/brand';
import { $t } from '#/locales';
import { useAuthStore } from '#/store';
import LoginForm from '#/views/_core/authentication/login.vue';
import { mapDashboardNotification } from '#/views/dashboard/workspace/map-workspace';

const notifications = ref<NotificationItem[]>([]);

const router = useRouter();
const userStore = useUserStore();
const authStore = useAuthStore();
const accessStore = useAccessStore();
const { destroyWatermark, updateWatermark } = useWatermark();
const { isDark, sidebarCollapsed } = usePreferences();
const showDot = computed(() =>
  notifications.value.some((item) => !item.isRead),
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

const avatar = computed(() => {
  return userStore.userInfo?.avatar ?? preferences.app.defaultAvatar;
});

async function handleLogout() {
  await authStore.logout(false);
}

function handleNoticeClear() {
  notifications.value = [];
}

function markRead(id: number | string) {
  const item = notifications.value.find((item) => item.id === id);
  if (item) {
    item.isRead = true;
  }
}

function remove(id: number | string) {
  notifications.value = notifications.value.filter((item) => item.id !== id);
}

function handleMakeAll() {
  notifications.value.forEach((item) => (item.isRead = true));
}

const viewAll = () => {
  router.push('/workspace').catch(() => undefined);
};

async function loadNotifications() {
  if (!accessStore.accessToken) {
    notifications.value = [];
    return;
  }
  try {
    const items = await getDashboardNotifications();
    notifications.value = items.map((item) => ({
      ...mapDashboardNotification(item),
      avatar: preferences.app.defaultAvatar,
    }));
  } catch {
    notifications.value = [];
  }
}

watch(
  () => accessStore.accessToken,
  (token) => {
    if (token) {
      loadNotifications().catch(() => undefined);
    } else {
      notifications.value = [];
    }
  },
  { immediate: true },
);

const handleClick = (item: NotificationItem) => {
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
  sidebarCollapsed,
  (collapsed) => {
    updatePreferences({
      logo: {
        enable: true,
        source: collapsed ? FRD_LOGO_SRC : '',
        sourceDark: collapsed ? FRD_LOGO_SRC_DARK : '',
      },
    });
  },
  { immediate: true },
);

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
    <template #logo-text>
      <span aria-label="FRD" class="app-logo-mark">
        <span class="app-logo-mark__letter">F</span>
        <span class="app-logo-mark__letter">R</span>
        <span class="app-logo-mark__letter">D</span>
      </span>
    </template>
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
      <Notification
        :dot="showDot"
        :notifications="notifications"
        @clear="handleNoticeClear"
        @read="(item) => item.id && markRead(item.id)"
        @remove="(item) => item.id && remove(item.id)"
        @make-all="handleMakeAll"
        @on-click="handleClick"
        @view-all="viewAll"
      />
    </template>
    <template #extra>
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

<style scoped>
:deep(.flex.h-full.items-center.text-lg) {
  width: 100%;
}

:deep(.flex.h-full.items-center.text-lg > a) {
  justify-content: center;
  width: 100%;
  padding-inline: 0;
}

.app-logo-mark {
  display: inline-flex;
  gap: 0.45em;
  align-items: baseline;
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 2.25rem;
  font-style: italic;
  font-weight: 700;
  line-height: 1;
}

.app-logo-mark__letter {
  color: #006fe6;
}
</style>
