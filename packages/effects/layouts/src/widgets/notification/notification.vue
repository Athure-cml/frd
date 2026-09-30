<script lang="ts" setup>
import type { NotificationItem } from './types';

import { Bell, CircleCheckBig, CircleX, MailCheck } from '@vben/icons';
import { $t } from '@vben/locales';

import {
  VbenButton,
  VbenIconButton,
  VbenPopover,
  VbenScrollbar,
} from '@vben-core/shadcn-ui';

import { useToggle } from '@vueuse/core';

defineOptions({ name: 'NotificationPopup' });

withDefaults(
  defineProps<{
    /** 未读数量（>0 时显示数字徽标） */
    count?: number;
    /** 显示圆点（无 count 时生效） */
    dot?: boolean;
    /** 空状态插画 */
    emptyImage?: string;
    /** 空状态文案 */
    emptyText?: string;
    /** 消息列表 */
    notifications?: NotificationItem[];
    /** 是否显示「查看所有消息」 */
    showViewAll?: boolean;
  }>(),
  {
    count: 0,
    dot: false,
    emptyImage: '',
    emptyText: '',
    notifications: () => [],
    showViewAll: true,
  },
);

const emit = defineEmits<{
  clear: [];
  makeAll: [];
  onClick: [NotificationItem];
  read: [NotificationItem];
  remove: [NotificationItem];
  viewAll: [];
}>();

const [open, toggle] = useToggle();

const close = () => {
  open.value = false;
};

const handleViewAll = () => {
  emit('viewAll');
  close();
};

const handleMakeAll = () => {
  emit('makeAll');
};

const handleClear = () => {
  emit('clear');
};
</script>
<template>
  <VbenPopover v-model:open="open" content-class="relative right-2 w-90 p-0">
    <template #trigger>
      <div class="mr-2 flex-center h-full" @click.stop="toggle()">
        <VbenIconButton class="bell-button relative text-foreground">
          <span v-if="count > 0" class="bell-badge">
            {{ count > 99 ? '99+' : count }}
          </span>
          <span
            v-else-if="dot"
            class="absolute top-0.5 right-0.5 size-2 rounded-sm bg-primary"
          ></span>
          <Bell class="size-4" />
        </VbenIconButton>
      </div>
    </template>

    <div class="relative">
      <div class="flex items-center justify-between p-4 py-3">
        <div class="text-foreground">{{ $t('ui.widgets.notifications') }}</div>
        <VbenIconButton
          :disabled="notifications.length <= 0"
          :tooltip="$t('ui.widgets.markAllAsRead')"
          @click="handleMakeAll"
        >
          <MailCheck class="size-4" />
        </VbenIconButton>
      </div>
      <VbenScrollbar v-if="notifications.length > 0">
        <ul class="flex! max-h-90 w-full flex-col">
          <template v-for="item in notifications" :key="item.id ?? item.title">
            <li
              class="relative flex w-full cursor-pointer items-start gap-3 border-t border-border p-3 hover:bg-accent"
              @click="emit('onClick', item)"
            >
              <slot name="content" :item="item">
                <span
                  v-if="!item.isRead"
                  class="absolute top-2 right-2 size-2 rounded-sm bg-primary"
                ></span>

                <span
                  class="relative flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted"
                >
                  <img
                    :src="item.avatar"
                    alt=""
                    class="aspect-square size-full object-contain p-1"
                  />
                </span>
                <div class="min-w-0 flex-1 pr-10">
                  <div class="flex flex-col gap-1 leading-none">
                    <p class="font-semibold">{{ item.title }}</p>
                    <p class="my-1 line-clamp-2 text-xs text-muted-foreground">
                      {{ item.message }}
                    </p>
                    <p class="line-clamp-2 text-xs text-muted-foreground">
                      {{ item.date }}
                    </p>
                  </div>
                </div>
                <div
                  class="absolute top-1/2 right-2 z-10 flex -translate-y-1/2 flex-row gap-1"
                >
                  <slot name="action" :item="item">
                    <slot name="action-prepend" :item="item"></slot>
                    <VbenIconButton
                      v-if="!item.isRead"
                      size="xs"
                      variant="ghost"
                      class="h-7 w-7 shrink-0 bg-background/80"
                      :tooltip="$t('common.confirm')"
                      @click.stop="emit('read', item)"
                    >
                      <CircleCheckBig class="size-4" />
                    </VbenIconButton>
                    <VbenIconButton
                      v-if="item.isRead"
                      size="xs"
                      variant="ghost"
                      class="h-7 w-7 shrink-0 bg-background/80 text-destructive"
                      :tooltip="$t('common.delete')"
                      @click.stop="emit('remove', item)"
                    >
                      <CircleX class="size-4" />
                    </VbenIconButton>
                    <slot name="action-append" :item="item"></slot>
                  </slot>
                </div>
              </slot>
            </li>
          </template>
        </ul>
      </VbenScrollbar>

      <template v-else>
        <div
          class="notice-empty flex-center min-h-37.5 w-full flex-col gap-2 px-4 py-6"
        >
          <img
            v-if="emptyImage"
            :src="emptyImage"
            alt=""
            class="notice-empty__img"
          />
          <div class="text-center text-sm text-muted-foreground">
            {{ emptyText || $t('common.noData') }}
          </div>
        </div>
      </template>

      <div
        class="flex items-center justify-between border-t border-border px-4 py-3"
      >
        <VbenButton
          :disabled="notifications.length <= 0"
          size="sm"
          variant="ghost"
          @click="handleClear"
        >
          {{ $t('ui.widgets.clearNotifications') }}
        </VbenButton>
        <VbenButton v-if="showViewAll" size="sm" @click="handleViewAll">
          {{ $t('ui.widgets.viewAll') }}
        </VbenButton>
      </div>
    </div>
  </VbenPopover>
</template>

<style scoped>
:deep(.bell-button) {
  &:hover {
    svg {
      animation: bell-ring 1s both;
    }
  }
}

.bell-badge {
  position: absolute;
  top: 2px;
  right: 2px;
  z-index: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  font-size: 10px;
  font-weight: 600;
  line-height: 1;
  color: #fff;
  background: #fa5151;
  border-radius: 999px;
}

.notice-empty__img {
  display: block;
  width: 112px;
  height: 112px;
  object-fit: cover;
  object-position: center;
  background: #fff;
  border-radius: 16px;
}

@keyframes bell-ring {
  0%,
  100% {
    transform-origin: top;
  }

  15% {
    transform: rotateZ(10deg);
  }

  30% {
    transform: rotateZ(-10deg);
  }

  45% {
    transform: rotateZ(5deg);
  }

  60% {
    transform: rotateZ(-5deg);
  }

  75% {
    transform: rotateZ(2deg);
  }
}
</style>
