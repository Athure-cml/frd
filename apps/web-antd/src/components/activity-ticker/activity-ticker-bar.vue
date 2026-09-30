<script lang="ts" setup>
import type { AnnouncementApi } from '#/api/system/announcement';

import { computed, nextTick, onUnmounted, ref, watch } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import { $t } from '#/locales';

defineOptions({ name: 'ActivityTickerBar' });

const props = defineProps<{
  items: AnnouncementApi.TickerItem[];
}>();

const SCROLL_SPEED = 60;

const viewportRef = ref<HTMLElement>();
const segmentRef = ref<HTMLElement>();
const viewportWidth = ref(0);
const segmentWidth = ref(0);
let resizeObserver: ResizeObserver | undefined;

const marqueeSegments = computed(() =>
  props.items.map((item) => item.text).join('    ·    '),
);

const scrollReady = computed(
  () => viewportWidth.value > 0 && segmentWidth.value > 0,
);

const trackStyle = computed(() => {
  const gap = Math.max(viewportWidth.value, 1);
  const distance = segmentWidth.value + gap;
  const duration = distance / SCROLL_SPEED;

  return {
    '--ticker-scroll-distance': `${distance}px`,
    animationDuration: `${duration}s`,
    gap: `${gap}px`,
    paddingLeft: `${gap}px`,
  };
});

const [DetailModal, detailModalApi] = useVbenModal({
  onConfirm() {
    detailModalApi.close();
  },
});

function openDetailModal() {
  detailModalApi.open();
}

function measureTickerLayout() {
  viewportWidth.value = viewportRef.value?.clientWidth ?? 0;
  segmentWidth.value = segmentRef.value?.offsetWidth ?? 0;
}

function setupResizeObserver() {
  resizeObserver?.disconnect();
  if (!viewportRef.value) {
    return;
  }
  resizeObserver = new ResizeObserver(() => {
    measureTickerLayout();
  });
  resizeObserver.observe(viewportRef.value);
  if (segmentRef.value) {
    resizeObserver.observe(segmentRef.value);
  }
}

async function refreshTickerLayout() {
  await nextTick();
  measureTickerLayout();
  setupResizeObserver();
}

watch(
  () => props.items,
  (items) => {
    if (items.length > 0) {
      void refreshTickerLayout();
    } else {
      resizeObserver?.disconnect();
      viewportWidth.value = 0;
      segmentWidth.value = 0;
    }
  },
  { deep: true, immediate: true },
);

watch(marqueeSegments, () => {
  if (props.items.length > 0) {
    void refreshTickerLayout();
  }
});

onUnmounted(() => {
  resizeObserver?.disconnect();
});
</script>

<template>
  <div class="activity-ticker" role="status">
    <div class="activity-ticker__label">
      <span aria-hidden="true" class="activity-ticker__icon">📢</span>
      <span class="activity-ticker__label-text">{{
        $t('page.system.activityTicker.label')
      }}</span>
    </div>

    <div
      ref="viewportRef"
      class="activity-ticker__viewport"
      role="button"
      tabindex="0"
      :aria-label="$t('page.system.activityTicker.viewDetail')"
      @click="openDetailModal"
      @keydown.enter="openDetailModal"
      @keydown.space.prevent="openDetailModal"
    >
      <div
        class="activity-ticker__track"
        :class="{ 'activity-ticker__track--ready': scrollReady }"
        :style="trackStyle"
      >
        <span ref="segmentRef" class="activity-ticker__text">{{
          marqueeSegments
        }}</span>
        <span aria-hidden="true" class="activity-ticker__text">{{
          marqueeSegments
        }}</span>
      </div>
    </div>

    <DetailModal
      :cancel-text="null"
      :confirm-text="$t('page.system.activityTicker.close')"
      :fullscreen-button="false"
      :show-cancel-button="false"
      :title="$t('page.system.activityTicker.detailTitle')"
      centered
      content-class="px-6 py-1 min-h-10 max-h-[min(60vh,32rem)] overflow-y-auto"
      footer-class="border-none px-6 pb-4 pt-2"
      header-class="border-none px-6 pt-6 pb-2"
    >
      <p class="activity-ticker-detail__content">{{ marqueeSegments }}</p>
    </DetailModal>
  </div>
</template>

<style scoped>
.activity-ticker {
  display: flex;
  gap: 12px;
  align-items: center;
  width: 100%;
  height: 34px;
  padding: 0 16px;
  background: linear-gradient(
    90deg,
    rgb(0 111 230 / 10%) 0%,
    rgb(0 111 230 / 5%) 100%
  );
  border-bottom: 1px solid rgb(0 111 230 / 20%);
}

.activity-ticker__label {
  display: inline-flex;
  flex-shrink: 0;
  gap: 6px;
  align-items: center;
  font-size: 12px;
  font-weight: 600;
  color: #006fe6;
  white-space: nowrap;
}

.activity-ticker__icon {
  font-size: 14px;
  line-height: 1;
}

.activity-ticker__viewport {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  cursor: pointer;
}

.activity-ticker__viewport:hover .activity-ticker__track--ready {
  animation-play-state: paused;
}

.activity-ticker__viewport:focus-visible {
  outline: 2px solid rgb(0 111 230 / 45%);
  outline-offset: 2px;
  border-radius: 4px;
}

.activity-ticker__track {
  display: inline-flex;
  width: max-content;
  will-change: transform;
}

.activity-ticker__track--ready {
  animation: activity-ticker-scroll linear infinite;
}

.activity-ticker__text {
  flex-shrink: 0;
  font-size: 13px;
  line-height: 34px;
  color: hsl(var(--foreground) / 88%);
  white-space: nowrap;
}

.activity-ticker-detail__content {
  margin: 0;
  font-size: 14px;
  line-height: 1.7;
  color: hsl(var(--foreground) / 88%);
  overflow-wrap: anywhere;
  white-space: pre-wrap;
}

@keyframes activity-ticker-scroll {
  from {
    transform: translateX(0);
  }

  to {
    transform: translateX(calc(-1 * var(--ticker-scroll-distance, 50%)));
  }
}

@media (prefers-reduced-motion: reduce) {
  .activity-ticker__track {
    flex-wrap: wrap;
    gap: 8px;
    width: 100%;
    padding-left: 0 !important;
    animation: none;
  }

  .activity-ticker__text:last-child {
    display: none;
  }

  .activity-ticker__text {
    line-height: 1.4;
    white-space: normal;
  }

  .activity-ticker {
    height: auto;
    min-height: 34px;
    padding-block: 8px;
  }
}
</style>
