import type { AnnouncementApi } from '#/api/system/announcement';

import { computed, onMounted, onUnmounted, ref, watch } from 'vue';

import { preferences } from '@vben/preferences';
import { useAccessStore } from '@vben/stores';

import { getTickerAnnouncements } from '#/api/system/announcement';

function normalizeTickerItems(items: AnnouncementApi.TickerItem[]) {
  return items.filter((item) => String(item.text ?? '').trim().length > 0);
}

export function useActivityTicker(enabled: () => boolean) {
  const accessStore = useAccessStore();
  const items = ref<AnnouncementApi.TickerItem[]>([]);
  let pollTimer: ReturnType<typeof setInterval> | undefined;

  const canPoll = computed(
    () =>
      enabled() &&
      !!accessStore.accessToken &&
      accessStore.isAccessChecked &&
      !accessStore.loginExpired,
  );

  const pollMinutes = () =>
    Math.max(preferences.app.checkUpdatesInterval || 3, 1);

  async function fetchTickerItems() {
    if (!canPoll.value) {
      items.value = [];
      return;
    }
    try {
      items.value = normalizeTickerItems(await getTickerAnnouncements());
    } catch {
      items.value = [];
    }
  }

  function startPolling() {
    stopPolling();
    void fetchTickerItems();
    pollTimer = setInterval(
      () => {
        void fetchTickerItems();
      },
      pollMinutes() * 60 * 1000,
    );
  }

  function stopPolling() {
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = undefined;
    }
  }

  watch(canPoll, (active) => {
    if (active) {
      startPolling();
      return;
    }
    stopPolling();
    items.value = [];
  });

  onMounted(() => {
    if (canPoll.value) {
      startPolling();
    }
  });

  onUnmounted(() => {
    stopPolling();
  });

  return {
    items,
    refresh: fetchTickerItems,
  };
}
