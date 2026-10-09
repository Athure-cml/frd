<script lang="ts" setup>
import type { WorkspaceRouteView } from '#/views/dashboard/workspace/map-workspace';

import { computed } from 'vue';

import { IconifyIcon } from '@vben/icons';

import { Drawer, Spin } from 'ant-design-vue';

import { $t } from '#/locales';
import { WORKSPACE_ILLUSTRATIONS } from '#/views/dashboard/workspace/illustrations';

const props = withDefaults(
  defineProps<{
    items?: WorkspaceRouteView[];
    loading?: boolean;
  }>(),
  {
    items: () => [],
    loading: false,
  },
);

const open = defineModel<boolean>('open', { default: false });

const maxValue = computed(() =>
  Math.max(...props.items.map((item) => item.value), 1),
);

function close() {
  open.value = false;
}
</script>

<template>
  <Drawer
    v-model:open="open"
    root-class-name="routes-drawer-root"
    class="routes-drawer-root"
    :closable="false"
    :title="null"
    placement="right"
    :width="440"
    :body-style="{
      padding: 0,
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
    }"
    destroy-on-close
  >
    <div class="routes-drawer">
      <header class="routes-drawer__header">
        <div class="routes-drawer__header-main">
          <span class="routes-drawer__icon-wrap" aria-hidden="true">
            <IconifyIcon icon="lucide:route" class="size-5" />
          </span>
          <div class="routes-drawer__heading">
            <h3 class="routes-drawer__title">
              {{ $t('page.workspace.routesDrawer.title') }}
            </h3>
            <p class="routes-drawer__subtitle">
              {{ $t('page.workspace.routesDrawer.subtitle') }}
            </p>
          </div>
          <button
            type="button"
            class="routes-drawer__close"
            aria-label="关闭"
            @click="close"
          >
            <IconifyIcon icon="lucide:x" class="size-4" />
          </button>
        </div>
      </header>

      <div class="routes-drawer__body">
        <div
          v-if="loading && items.length === 0"
          class="routes-drawer__loading"
        >
          <Spin />
        </div>

        <div v-else-if="items.length === 0" class="routes-drawer__empty">
          <img
            :src="WORKSPACE_ILLUSTRATIONS.emptyRoutes"
            alt=""
            class="routes-drawer__empty-img"
          />
          <p class="routes-drawer__empty-text">
            {{ $t('page.workspace.routesDrawer.empty') }}
          </p>
        </div>

        <ul v-else class="routes-drawer__list">
          <li
            v-for="(item, index) in items"
            :key="item.name"
            class="routes-drawer__item"
          >
            <span
              class="routes-drawer__rank"
              :class="{
                'routes-drawer__rank--top': index < 3,
              }"
            >
              {{ index + 1 }}
            </span>
            <IconifyIcon
              icon="lucide:route"
              class="routes-drawer__icon size-4"
            />
            <div class="routes-drawer__content">
              <span class="routes-drawer__name">{{ item.name }}</span>
              <div class="routes-drawer__bar">
                <span
                  class="routes-drawer__fill"
                  :style="{
                    width: `${(item.value / maxValue) * 100}%`,
                  }"
                ></span>
              </div>
            </div>
            <span class="routes-drawer__value">{{ item.value }}</span>
          </li>
        </ul>
      </div>
    </div>
  </Drawer>
</template>

<style scoped>
.routes-drawer {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #f7f8fa;
}

:global(html.dark) .routes-drawer {
  background: hsl(var(--background));
}

.routes-drawer__header {
  flex-shrink: 0;
  padding: 14px 16px 12px;
  background: #fff;
  border-bottom: 1px solid #eceef1;
}

:global(html.dark) .routes-drawer__header {
  background: hsl(var(--card));
  border-bottom-color: hsl(var(--border));
}

.routes-drawer__header-main {
  display: flex;
  gap: 10px;
  align-items: flex-start;
}

.routes-drawer__icon-wrap {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  color: #3370ff;
  background: #e8f0ff;
  border-radius: 10px;
}

:global(html.dark) .routes-drawer__icon-wrap {
  color: hsl(var(--primary));
  background: hsl(var(--accent));
}

.routes-drawer__heading {
  flex: 1;
  min-width: 0;
}

.routes-drawer__title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  line-height: 1.3;
  color: #1f2329;
}

:global(html.dark) .routes-drawer__title {
  color: hsl(var(--foreground));
}

.routes-drawer__subtitle {
  margin: 2px 0 0;
  font-size: 12px;
  line-height: 1.4;
  color: #8f959e;
}

.routes-drawer__close {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  margin-top: 2px;
  color: #8f959e;
  cursor: pointer;
  background: transparent;
  border: 0;
  border-radius: 6px;
}

.routes-drawer__close:hover {
  color: #1f2329;
  background: #f2f3f5;
}

:global(html.dark) .routes-drawer__close:hover {
  color: hsl(var(--foreground));
  background: hsl(var(--accent));
}

.routes-drawer__body {
  flex: 1;
  min-height: 0;
  overflow: auto;
  background: #fff;
}

:global(html.dark) .routes-drawer__body {
  background: hsl(var(--card));
}

.routes-drawer__loading,
.routes-drawer__empty {
  display: flex;
  flex-direction: column;
  gap: 10px;
  align-items: center;
  justify-content: center;
  min-height: 280px;
  padding: 48px 16px;
  text-align: center;
}

.routes-drawer__empty-img {
  display: block;
  width: 128px;
  height: 128px;
  object-fit: cover;
  object-position: center;
  background: #fff;
  border-radius: 16px;
}

.routes-drawer__empty-text {
  max-width: 28ch;
  margin: 0;
  font-size: 13px;
  line-height: 1.5;
  color: #8f959e;
}

.routes-drawer__list {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 16px;
  margin: 0;
  list-style: none;
}

.routes-drawer__item {
  display: flex;
  gap: 10px;
  align-items: center;
}

.routes-drawer__rank {
  width: 22px;
  font-size: 13px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: #8f959e;
  text-align: center;
}

.routes-drawer__rank--top {
  color: #3370ff;
}

.routes-drawer__icon {
  flex-shrink: 0;
  color: #3370ff;
}

:global(html.dark) .routes-drawer__icon {
  color: hsl(var(--primary));
}

.routes-drawer__content {
  flex: 1;
  min-width: 0;
}

.routes-drawer__name {
  display: block;
  margin-bottom: 6px;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 13px;
  color: #1f2329;
  white-space: nowrap;
}

:global(html.dark) .routes-drawer__name {
  color: hsl(var(--foreground));
}

.routes-drawer__bar {
  height: 6px;
  overflow: hidden;
  background: #f0f2f5;
  border-radius: 999px;
}

:global(html.dark) .routes-drawer__bar {
  background: hsl(var(--muted));
}

.routes-drawer__fill {
  display: block;
  height: 100%;
  background: linear-gradient(
    90deg,
    hsl(var(--primary)),
    color-mix(in srgb, hsl(var(--primary)) 55%, white)
  );
  border-radius: 999px;
}

.routes-drawer__value {
  flex-shrink: 0;
  min-width: 28px;
  font-size: 13px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: #1f2329;
  text-align: right;
}

:global(html.dark) .routes-drawer__value {
  color: hsl(var(--foreground));
}
</style>

<style>
.routes-drawer-root .ant-drawer-header {
  display: none !important;
}

.routes-drawer-root .ant-drawer-body {
  height: 100%;
  padding: 0 !important;
}

.routes-drawer-root.ant-drawer-content,
.routes-drawer-root .ant-drawer-content {
  overflow: hidden;
}
</style>
