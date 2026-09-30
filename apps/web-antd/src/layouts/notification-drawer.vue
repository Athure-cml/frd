<script lang="ts" setup>
import type { NotificationItem } from '@vben/layouts';

import { computed } from 'vue';

import { IconifyIcon } from '@vben/icons';

import { Drawer, Tooltip } from 'ant-design-vue';

import { $t } from '#/locales';
import { WORKSPACE_ILLUSTRATIONS } from '#/views/dashboard/workspace/illustrations';

const props = withDefaults(
  defineProps<{
    avatarSrc?: string;
    loading?: boolean;
    notifications?: NotificationItem[];
  }>(),
  {
    avatarSrc: '',
    loading: false,
    notifications: () => [],
  },
);

const emit = defineEmits<{
  clear: [];
  makeAll: [];
  onClick: [NotificationItem];
  read: [NotificationItem];
  remove: [NotificationItem];
}>();

const open = defineModel<boolean>('open', { default: false });

const unreadCount = computed(
  () => props.notifications.filter((item) => !item.isRead).length,
);

function close() {
  open.value = false;
}

function onItemClick(item: NotificationItem) {
  emit('onClick', item);
  close();
}
</script>

<template>
  <Drawer
    v-model:open="open"
    root-class-name="qq-notice-drawer"
    class="qq-notice-drawer"
    :closable="false"
    :title="null"
    placement="right"
    :width="392"
    :body-style="{
      padding: 0,
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
    }"
    destroy-on-close
  >
    <div class="qq-notice">
      <header class="qq-notice__header">
        <div class="qq-notice__header-top">
          <div class="qq-notice__header-main">
            <h3 class="qq-notice__title">
              {{ $t('page.notifications.title') }}
            </h3>
            <span v-if="unreadCount > 0" class="qq-notice__badge">
              {{ unreadCount > 99 ? '99+' : unreadCount }}
            </span>
          </div>
          <button
            type="button"
            class="qq-notice__close"
            aria-label="关闭"
            @click="close"
          >
            <IconifyIcon icon="lucide:x" class="size-4" />
          </button>
        </div>
        <div class="qq-notice__header-actions">
          <button
            type="button"
            class="qq-notice__text-btn"
            :disabled="unreadCount <= 0 || loading"
            @click="emit('makeAll')"
          >
            {{ $t('ui.widgets.markAllAsRead') }}
          </button>
          <span class="qq-notice__sep">|</span>
          <button
            type="button"
            class="qq-notice__text-btn"
            :disabled="notifications.length <= 0 || loading"
            @click="emit('clear')"
          >
            {{ $t('ui.widgets.clearNotifications') }}
          </button>
        </div>
      </header>

      <div v-if="notifications.length === 0" class="qq-notice__empty">
        <img
          :src="WORKSPACE_ILLUSTRATIONS.emptyNotices"
          alt=""
          class="qq-notice__empty-img"
        />
        <p class="qq-notice__empty-text">
          {{ $t('page.notifications.empty') }}
        </p>
      </div>

      <ul v-else class="qq-notice__list">
        <li
          v-for="item in notifications"
          :key="item.id ?? item.title"
          class="qq-notice__item"
          :class="{ 'qq-notice__item--unread': !item.isRead }"
          @click="onItemClick(item)"
        >
          <span class="qq-notice__avatar-wrap">
            <span class="qq-notice__avatar">
              <img :src="item.avatar || avatarSrc" alt="" />
            </span>
            <i v-if="!item.isRead" class="qq-notice__dot"></i>
          </span>

          <div class="qq-notice__content">
            <div class="qq-notice__row">
              <p class="qq-notice__name">{{ item.title }}</p>
              <time class="qq-notice__time">{{ item.date }}</time>
            </div>
            <p class="qq-notice__preview">{{ item.message }}</p>
          </div>

          <div class="qq-notice__ops" @click.stop>
            <Tooltip
              v-if="!item.isRead"
              :title="$t('page.notifications.markRead')"
            >
              <button
                type="button"
                class="qq-notice__icon-btn"
                :disabled="loading"
                @click="emit('read', item)"
              >
                <IconifyIcon icon="lucide:check" class="size-3.5" />
              </button>
            </Tooltip>
            <Tooltip :title="$t('common.delete')">
              <button
                type="button"
                class="qq-notice__icon-btn qq-notice__icon-btn--danger"
                :disabled="loading"
                @click="emit('remove', item)"
              >
                <IconifyIcon icon="lucide:x" class="size-3.5" />
              </button>
            </Tooltip>
          </div>
        </li>
      </ul>
    </div>
  </Drawer>
</template>

<style scoped>
.qq-notice {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #fff;
}

:global(html.dark) .qq-notice {
  background: hsl(var(--card));
}

.qq-notice__header {
  display: flex;
  flex-shrink: 0;
  flex-direction: column;
  gap: 8px;
  padding: 14px 16px 10px;
  background: #fff;
  border-bottom: 1px solid #eceef1;
}

:global(html.dark) .qq-notice__header {
  background: hsl(var(--card));
  border-bottom-color: hsl(var(--border));
}

.qq-notice__header-top {
  display: flex;
  gap: 8px;
  align-items: center;
  justify-content: space-between;
}

.qq-notice__header-main {
  display: flex;
  gap: 8px;
  align-items: center;
}

.qq-notice__close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  color: #8f959e;
  cursor: pointer;
  background: transparent;
  border: 0;
  border-radius: 6px;
}

.qq-notice__close:hover {
  color: #1f2329;
  background: #f2f3f5;
}

:global(html.dark) .qq-notice__close:hover {
  color: hsl(var(--foreground));
  background: hsl(var(--accent));
}

.qq-notice__title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  line-height: 1.2;
  color: #000;
  letter-spacing: 0.2px;
}

:global(html.dark) .qq-notice__title {
  color: hsl(var(--foreground));
}

.qq-notice__badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  font-size: 11px;
  font-weight: 600;
  line-height: 1;
  color: #fff;
  background: #fa5151;
  border-radius: 999px;
}

.qq-notice__header-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.qq-notice__text-btn {
  padding: 0;
  font-size: 12px;
  color: #3370ff;
  cursor: pointer;
  background: transparent;
  border: 0;
}

.qq-notice__text-btn:disabled {
  color: #c0c4cc;
  cursor: not-allowed;
}

.qq-notice__text-btn:not(:disabled):hover {
  color: #245bdb;
}

.qq-notice__sep {
  font-size: 12px;
  color: #d0d3d9;
}

.qq-notice__empty {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 10px;
  align-items: center;
  justify-content: center;
  padding: 48px 16px;
  text-align: center;
  background: #fff;
}

.qq-notice__empty-img {
  display: block;
  width: 128px;
  height: 128px;
  object-fit: cover;
  object-position: center;
  background: #fff;
  border-radius: 16px;
}

.qq-notice__empty-text {
  max-width: 28ch;
  margin: 0;
  font-size: 13px;
  line-height: 1.5;
  color: #8f959e;
}

:global(html.dark) .qq-notice__empty {
  background: hsl(var(--card));
}

.qq-notice__list {
  flex: 1;
  padding: 0;
  margin: 0;
  overflow: auto;
  list-style: none;
  background: #fff;
}

:global(html.dark) .qq-notice__list {
  background: hsl(var(--card));
}

.qq-notice__item {
  position: relative;
  display: flex;
  gap: 12px;
  align-items: flex-start;
  padding: 14px 16px;
  cursor: pointer;
  transition: background-color 0.12s ease;
}

.qq-notice__item:hover {
  background: #f5f5f5;
}

:global(html.dark) .qq-notice__item:hover {
  background: hsl(var(--accent));
}

.qq-notice__avatar-wrap {
  position: relative;
  flex-shrink: 0;
  width: 40px;
  height: 40px;
}

.qq-notice__avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  overflow: hidden;
  background: #ebedf0;
  border-radius: 8px;
}

:global(html.dark) .qq-notice__avatar {
  background: hsl(var(--muted));
}

.qq-notice__avatar img {
  width: 100%;
  height: 100%;
  padding: 4px;
  object-fit: contain;
}

.qq-notice__dot {
  position: absolute;
  top: -1px;
  right: -1px;
  width: 9px;
  height: 9px;
  background: #fa5151;
  border: 2px solid #fff;
  border-radius: 50%;
}

:global(html.dark) .qq-notice__dot {
  border-color: hsl(var(--card));
}

.qq-notice__content {
  flex: 1;
  min-width: 0;
  padding-right: 4px;
}

.qq-notice__row {
  display: flex;
  gap: 8px;
  align-items: baseline;
  justify-content: space-between;
}

.qq-notice__name {
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 14px;
  font-weight: 500;
  line-height: 1.35;
  color: #000;
  white-space: nowrap;
}

:global(html.dark) .qq-notice__name {
  color: hsl(var(--foreground));
}

.qq-notice__item--unread .qq-notice__name {
  font-weight: 600;
}

.qq-notice__time {
  flex-shrink: 0;
  font-size: 12px;
  line-height: 1.35;
  color: #b0b3b8;
}

.qq-notice__preview {
  display: -webkit-box;
  margin: 3px 0 0;
  overflow: hidden;
  -webkit-line-clamp: 2;
  font-size: 12px;
  line-height: 1.4;
  color: #999;
  -webkit-box-orient: vertical;
}

.qq-notice__ops {
  display: flex;
  flex-shrink: 0;
  gap: 2px;
  align-items: center;
  align-self: center;
  opacity: 0;
  transition: opacity 0.15s ease;
}

.qq-notice__item:hover .qq-notice__ops {
  opacity: 1;
}

.qq-notice__icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  color: #8f959e;
  cursor: pointer;
  background: transparent;
  border: 0;
  border-radius: 6px;
}

.qq-notice__icon-btn:hover {
  color: #3370ff;
  background: #e8f0ff;
}

.qq-notice__icon-btn--danger:hover {
  color: #f56c6c;
  background: #fdecec;
}

.qq-notice__icon-btn:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}
</style>

<style>
.qq-notice-drawer .ant-drawer-header {
  display: none !important;
}

.qq-notice-drawer .ant-drawer-body {
  height: 100%;
  padding: 0 !important;
}

.qq-notice-drawer.ant-drawer-content,
.qq-notice-drawer .ant-drawer-content {
  overflow: hidden;
}
</style>
