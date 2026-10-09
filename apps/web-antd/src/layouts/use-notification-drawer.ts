import type { NotificationItem } from '@vben/layouts';

import { computed, ref } from 'vue';

import { message } from 'ant-design-vue';

import {
  dismissAllDashboardNotifications,
  dismissDashboardNotification,
  getDashboardNotifications,
  markAllDashboardNotificationsRead,
  markDashboardNotificationRead,
} from '#/api/dashboard';
import { FRD_QUOTE_LOGO_SRC } from '#/constants/brand';
import { $t } from '#/locales';
import { mapDashboardNotification } from '#/views/dashboard/workspace/map-workspace';

const NOTICE_AVATAR = FRD_QUOTE_LOGO_SRC;

const open = ref(false);
const loading = ref(false);
const acting = ref(false);
const notifications = ref<NotificationItem[]>([]);
let loadedOnce = false;

const unreadCount = computed(
  () => notifications.value.filter((item) => !item.isRead).length,
);

const showDot = computed(() =>
  notifications.value.some((item) => !item.isRead),
);

async function loadNotifications(force = false) {
  if (loading.value) {
    return;
  }
  if (loadedOnce && !force) {
    return;
  }
  loading.value = true;
  try {
    const items = await getDashboardNotifications();
    notifications.value = items.map((item) => ({
      ...mapDashboardNotification(item),
      avatar: NOTICE_AVATAR,
    }));
    loadedOnce = true;
  } catch {
    if (!loadedOnce) {
      notifications.value = [];
    }
  } finally {
    loading.value = false;
  }
}

async function clearNotifications() {
  if (acting.value) {
    return;
  }
  acting.value = true;
  try {
    await dismissAllDashboardNotifications();
    notifications.value = [];
  } catch {
    message.error($t('page.notifications.actionFailed'));
  } finally {
    acting.value = false;
  }
}

async function markRead(item: NotificationItem) {
  if (!item.id || acting.value) {
    return;
  }
  acting.value = true;
  try {
    await markDashboardNotificationRead(String(item.id));
    item.isRead = true;
  } catch {
    message.error($t('page.notifications.actionFailed'));
  } finally {
    acting.value = false;
  }
}

async function remove(item: NotificationItem) {
  if (!item.id || acting.value) {
    return;
  }
  acting.value = true;
  try {
    await dismissDashboardNotification(String(item.id));
    notifications.value = notifications.value.filter(
      (row) => row.id !== item.id,
    );
  } catch {
    message.error($t('page.notifications.actionFailed'));
  } finally {
    acting.value = false;
  }
}

async function markAllRead() {
  if (acting.value) {
    return;
  }
  acting.value = true;
  try {
    await markAllDashboardNotificationsRead();
    notifications.value.forEach((item) => {
      item.isRead = true;
    });
  } catch {
    message.error($t('page.notifications.actionFailed'));
  } finally {
    acting.value = false;
  }
}

function openNoticeDrawer() {
  open.value = true;
  void loadNotifications(true);
}

function closeNoticeDrawer() {
  open.value = false;
}

function resetNotifications() {
  open.value = false;
  notifications.value = [];
  loadedOnce = false;
}

export function useNotificationDrawer() {
  return {
    acting,
    avatarSrc: NOTICE_AVATAR,
    clearNotifications,
    closeNoticeDrawer,
    loadNotifications,
    loading,
    markAllRead,
    markRead,
    notifications,
    open,
    openNoticeDrawer,
    remove,
    resetNotifications,
    showDot,
    unreadCount,
  };
}
