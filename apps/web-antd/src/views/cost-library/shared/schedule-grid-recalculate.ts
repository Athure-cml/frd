import type { Ref } from 'vue';

import { nextTick, onBeforeUnmount, onMounted, watch } from 'vue';

import { useAccessStore } from '@vben/stores';

type GridLike = null | {
  recalculate?: (refull?: boolean) => void;
  refreshScroll?: () => void;
};

const STABLE_MS = 200;
const MIN_HOST_SIZE = 80;

/**
 * fit:false 下用 recalculate(true) 重算 scrollXWidth。
 * 禁止在布局抖动中间态连算——菜单加载完瞬间宽度突变时乱算会把横条关掉，
 * 再靠长延迟「恢复」，体验就是严重闪烁。
 */
export function runGridRecalculate(getGrid: () => GridLike) {
  try {
    const grid = getGrid();
    grid?.recalculate?.(true);
    grid?.refreshScroll?.();
  } catch {
    // grid may already be disposed
  }
}

function hostSizeOk(host: HTMLElement) {
  const { width, height } = host.getBoundingClientRect();
  return width >= MIN_HOST_SIZE && height >= MIN_HOST_SIZE;
}

/**
 * 尺寸稳定 STABLE_MS 后再算一次；抖动期间只推迟、不中途乱算。
 */
export function scheduleGridRecalculate(getGrid: () => GridLike) {
  void nextTick(() => {
    requestAnimationFrame(() => runGridRecalculate(getGrid));
  });
}

export function useGridResizeRecalculate(
  hostRef: Ref<HTMLElement | null | undefined>,
  getGrid: () => GridLike,
) {
  let observer: null | ResizeObserver = null;
  let stableTimer: number | undefined;
  let lastWidth = 0;
  let lastHeight = 0;

  function queueStableRecalculate() {
    const host = hostRef.value;
    if (host && !hostSizeOk(host)) {
      return;
    }
    window.clearTimeout(stableTimer);
    stableTimer = window.setTimeout(() => {
      const current = hostRef.value;
      if (current && !hostSizeOk(current)) {
        return;
      }
      runGridRecalculate(getGrid);
    }, STABLE_MS);
  }

  onMounted(() => {
    scheduleGridRecalculate(getGrid);
    // 首帧后再排一次稳定重算（覆盖 content-height 首次写入）
    window.setTimeout(() => queueStableRecalculate(), 0);

    const host = hostRef.value;
    if (!host || typeof ResizeObserver === 'undefined') {
      return;
    }
    const rect = host.getBoundingClientRect();
    lastWidth = Math.round(rect.width);
    lastHeight = Math.round(rect.height);
    observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      const box = entry?.contentRect;
      const nextWidth = Math.round(
        box?.width ?? host.getBoundingClientRect().width,
      );
      const nextHeight = Math.round(
        box?.height ?? host.getBoundingClientRect().height,
      );
      if (
        Math.abs(nextWidth - lastWidth) < 2 &&
        Math.abs(nextHeight - lastHeight) < 2
      ) {
        return;
      }
      lastWidth = nextWidth;
      lastHeight = nextHeight;
      // 菜单加载会连续触发 resize：等停稳再算，避免中间态把横条关掉
      queueStableRecalculate();
    });
    observer.observe(host);
  });

  // 权限菜单异步灌入侧栏后布局会变；等 access 就绪且尺寸停稳后再重算
  const accessStore = useAccessStore();
  const stopAccessWatch = watch(
    () => accessStore.isAccessChecked,
    (checked) => {
      if (checked) {
        void nextTick(() => queueStableRecalculate());
      }
    },
    { immediate: true },
  );

  onBeforeUnmount(() => {
    window.clearTimeout(stableTimer);
    stopAccessWatch();
    observer?.disconnect();
    observer = null;
  });
}
