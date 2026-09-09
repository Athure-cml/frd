<script setup lang="ts">
import type { AnnouncementApi } from '#/api/system/announcement';

import { computed, inject, onMounted, onUnmounted, ref, watch } from 'vue';

import { useVbenModal } from '@vben/common-ui';
import { MODAL_POPUP_GATE_KEY } from '@vben/layouts';
import { VbenTiptapPreview } from '@vben/plugins/tiptap';
import { preferences } from '@vben/preferences';
import { useAccessStore } from '@vben/stores';

import {
  acknowledgeAnnouncement,
  getPendingAnnouncements,
} from '#/api/system/announcement';
import { $t } from '#/locales';
import { normalizeRichContent } from '#/views/system/announcement/data';

import '#/views/system/shared/system.css';

defineOptions({ name: 'SystemAnnouncementHost' });

/** 登录后稍等再弹，避免刚进系统就被打断 */
const INITIAL_OPEN_DELAY_MS = 2000;

const accessStore = useAccessStore();
const queue = ref<AnnouncementApi.Announcement[]>([]);
const current = ref<AnnouncementApi.Announcement | null>(null);
const displayTitle = ref('');
const displayContent = ref('');
const timer = ref<ReturnType<typeof setInterval>>();
let isFetching = false;
let hasOpenedThisSession = false;
let openDelayTimer: ReturnType<typeof setTimeout> | undefined;

const canPoll = computed(
  () =>
    !!accessStore.accessToken &&
    accessStore.isAccessChecked &&
    !accessStore.loginExpired,
);

const modalPopupGate = inject(MODAL_POPUP_GATE_KEY, null);

const isBlockedByVersionUpdate = computed(
  () => modalPopupGate?.versionUpdateModalOpen.value ?? false,
);

const pollMinutes = () =>
  Math.max(preferences.app.checkUpdatesInterval || 3, 1);

const pendingQueueCount = computed(() => queue.value.length);

const [AnnouncementModal, modalApi] = useVbenModal({
  closable: false,
  closeOnPressEscape: false,
  closeOnClickModal: false,
  onConfirm: handleAcknowledge,
  onOpenChange(isOpen) {
    if (!isOpen) {
      current.value = null;
      displayTitle.value = '';
      displayContent.value = '';
      showNext();
    }
  },
});

async function fetchPending() {
  if (!canPoll.value || isFetching) {
    return;
  }
  isFetching = true;
  try {
    const items = await getPendingAnnouncements();
    if (items.length > 0) {
      const seen = new Set(queue.value.map((item) => item.id));
      for (const item of items) {
        if (!seen.has(item.id) && item.id !== current.value?.id) {
          queue.value.push(item);
        }
      }
      showNext();
    }
  } catch {
    // ignore polling errors
  } finally {
    isFetching = false;
  }
}

function clearOpenDelay() {
  clearTimeout(openDelayTimer);
  openDelayTimer = undefined;
}

function openCurrent() {
  if (isBlockedByVersionUpdate.value) {
    return;
  }
  const item = queue.value.shift();
  if (!item) {
    return;
  }
  current.value = item;
  displayTitle.value = item.title;
  displayContent.value = item.content;
  modalApi.open();
}

function pauseCurrentForVersionUpdate() {
  clearOpenDelay();
  if (!current.value) {
    return;
  }
  queue.value.unshift(current.value);
  current.value = null;
  displayTitle.value = '';
  displayContent.value = '';
  modalApi.close();
}

function showNext() {
  if (isBlockedByVersionUpdate.value) {
    return;
  }
  if (current.value || queue.value.length === 0 || openDelayTimer) {
    return;
  }
  if (!hasOpenedThisSession) {
    openDelayTimer = setTimeout(() => {
      openDelayTimer = undefined;
      hasOpenedThisSession = true;
      if (!isBlockedByVersionUpdate.value) {
        openCurrent();
      }
    }, INITIAL_OPEN_DELAY_MS);
    return;
  }
  openCurrent();
}

async function handleAcknowledge() {
  const item = current.value;
  if (!item) {
    modalApi.close();
    return;
  }
  try {
    await acknowledgeAnnouncement(item.id);
  } catch {
    // still close locally to avoid blocking the user
  } finally {
    modalApi.close();
  }
}

function startPolling() {
  stopPolling();
  timer.value = setInterval(fetchPending, pollMinutes() * 60 * 1000);
}

function stopPolling() {
  clearInterval(timer.value);
}

function handleVisibilityChange() {
  if (document.hidden) {
    stopPolling();
  } else if (canPoll.value) {
    fetchPending().finally(startPolling);
  }
}

function resetState() {
  queue.value = [];
  current.value = null;
  displayTitle.value = '';
  displayContent.value = '';
  hasOpenedThisSession = false;
  clearOpenDelay();
  modalApi.close();
  stopPolling();
}

watch(
  canPoll,
  (ready) => {
    resetState();
    if (ready) {
      fetchPending().finally(startPolling);
    }
  },
  { immediate: true },
);

watch(isBlockedByVersionUpdate, (blocked) => {
  if (blocked) {
    pauseCurrentForVersionUpdate();
    return;
  }
  showNext();
});

onMounted(() => {
  document.addEventListener('visibilitychange', handleVisibilityChange);
});

onUnmounted(() => {
  stopPolling();
  clearOpenDelay();
  document.removeEventListener('visibilitychange', handleVisibilityChange);
});
</script>

<template>
  <AnnouncementModal
    :cancel-text="null"
    :confirm-text="$t('ui.widgets.announcementConfirm')"
    :fullscreen-button="false"
    :show-cancel-button="false"
    :title="displayTitle"
    centered
    content-class="px-6 py-1 min-h-10 max-h-[min(60vh,32rem)] overflow-y-auto"
    footer-class="border-none px-6 pb-4 pt-2"
    header-class="border-none px-6 pt-6 pb-2"
  >
    <VbenTiptapPreview
      v-if="displayContent"
      :content="normalizeRichContent(displayContent)"
      class="sys-announcement-popup-body"
      :min-height="0"
    />
    <p
      v-else
      class="sys-announcement-popup-body sys-announcement-popup-body--empty"
    >
      {{ $t('page.system.announcementPage.popupEmptyContent') }}
    </p>
    <template v-if="pendingQueueCount > 0" #prepend-footer>
      <p class="sys-announcement-popup-queue">
        {{ $t('page.system.announcementPage.queueHint', [pendingQueueCount]) }}
      </p>
    </template>
  </AnnouncementModal>
</template>
