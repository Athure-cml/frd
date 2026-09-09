<script setup lang="ts">
import { inject, onMounted, onUnmounted, ref } from 'vue';

import { $t } from '@vben/locales';

import { useVbenModal } from '@vben-core/popup-ui';

import { MODAL_POPUP_GATE_KEY } from './modal-popup-gate';

interface Props {
  // 轮询时间，分钟
  checkUpdatesInterval?: number;
  // 检查更新的地址
  checkUpdateUrl?: string;
}

defineOptions({ name: 'CheckUpdates' });

const props = withDefaults(defineProps<Props>(), {
  checkUpdatesInterval: 1,
  checkUpdateUrl: import.meta.env.BASE_URL || '/',
});

let isCheckingUpdates = false;
const currentVersionTag = ref('');
const lastVersionTag = ref('');
const timer = ref<ReturnType<typeof setInterval>>();

const modalPopupGate = inject(MODAL_POPUP_GATE_KEY, null);

const [UpdateNoticeModal, modalApi] = useVbenModal({
  closable: false,
  closeOnPressEscape: false,
  closeOnClickModal: false,
  onConfirm() {
    lastVersionTag.value = currentVersionTag.value;
    window.location.reload();
    // handleSubmitLogout();
  },
  onOpenChange(isOpen) {
    modalPopupGate?.setVersionUpdateModalOpen(isOpen);
  },
});

function extractVersionTag(source: string) {
  const configMatch = source.match(/_app-config-[\d.]+-([a-f0-9]+)\.js/i);
  const entryMatch = source.match(/\/jse\/index-index-[^"'\s>]+\.js/i);
  const parts = [entryMatch?.[0], configMatch?.[1]].filter(Boolean);
  return parts.length > 0 ? parts.join('|') : null;
}

async function getVersionTag() {
  try {
    if (
      location.hostname === 'localhost' ||
      location.hostname === '127.0.0.1'
    ) {
      return null;
    }
    const baseUrl = props.checkUpdateUrl || '/';
    const url = `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}_vcheck=${Date.now()}`;
    const response = await fetch(url, {
      cache: 'no-cache',
      method: 'GET',
    });
    if (!response.ok) {
      return null;
    }
    const html = await response.text();
    const tag = extractVersionTag(html);
    if (tag) {
      return tag;
    }
    return (
      response.headers.get('etag') || response.headers.get('last-modified')
    );
  } catch {
    console.error('Failed to fetch version tag');
    return null;
  }
}

function getLoadedVersionTag() {
  const configScript = document.querySelector('script[src*="_app-config-"]');
  const configSrc = configScript?.getAttribute('src') ?? '';
  const entryScript = document.querySelector(
    'script[src*="/jse/index-index-"]',
  );
  const entrySrc = entryScript?.getAttribute('src') ?? '';
  return extractVersionTag(`${configSrc} ${entrySrc}`) ?? '';
}

async function checkForUpdates() {
  const versionTag = await getVersionTag();
  if (!versionTag) {
    return;
  }

  const loadedTag = lastVersionTag.value || getLoadedVersionTag();
  if (!loadedTag) {
    lastVersionTag.value = versionTag;
    return;
  }

  if (loadedTag !== versionTag) {
    clearInterval(timer.value);
    handleNotice(versionTag);
  }
}
function handleNotice(versionTag: string) {
  currentVersionTag.value = versionTag;
  modalApi.open();
}

function start() {
  if (props.checkUpdatesInterval <= 0) {
    return;
  }

  // 每 checkUpdatesInterval(默认值为1) 分钟检查一次
  timer.value = setInterval(
    checkForUpdates,
    props.checkUpdatesInterval * 60 * 1000,
  );
}

function handleVisibilitychange() {
  if (document.hidden) {
    stop();
  } else {
    if (!isCheckingUpdates) {
      isCheckingUpdates = true;
      checkForUpdates().finally(() => {
        isCheckingUpdates = false;
        start();
      });
    }
  }
}

function stop() {
  clearInterval(timer.value);
}

onMounted(() => {
  lastVersionTag.value = getLoadedVersionTag();
  void checkForUpdates();
  start();
  document.addEventListener('visibilitychange', handleVisibilitychange);
});

onUnmounted(() => {
  stop();
  document.removeEventListener('visibilitychange', handleVisibilitychange);
});
</script>
<template>
  <UpdateNoticeModal
    :cancel-text="$t('common.cancel')"
    :confirm-text="$t('common.refresh')"
    :fullscreen-button="false"
    :title="$t('ui.widgets.checkUpdatesTitle')"
    centered
    content-class="px-8 min-h-10"
    footer-class="border-none mb-3 mr-3"
    header-class="border-none"
  >
    {{ $t('ui.widgets.checkUpdatesDescription') }}
  </UpdateNoticeModal>
</template>
