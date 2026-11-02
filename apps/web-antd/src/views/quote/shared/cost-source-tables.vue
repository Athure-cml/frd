<script lang="ts" setup>
import type { QuoteApi, QuoteCostType } from '#/api/quote';

import { computed, nextTick, ref, watch } from 'vue';

import { IconifyIcon } from '@vben/icons';

import { Button, Tabs, Tag } from 'ant-design-vue';

import { $t } from '#/locales';

import CostSnapshotGrid from './cost-snapshot-grid.vue';
import { orderCostSourceTypes } from './cost-source-types';

const props = withDefaults(
  defineProps<{
    canImport?: boolean;
    /** 按服务类型过滤展示的报价库 Tab；不传则展示全部三类 */
    costTypes?: QuoteCostType[];
    matches: QuoteApi.QuoteCostMatchItem[];
  }>(),
  {
    canImport: false,
    costTypes: undefined,
  },
);

const emit = defineEmits<{
  import: [type: QuoteCostType];
}>();

const visibleCostTypes = computed(() => {
  if (props.costTypes === undefined || props.costTypes === null) {
    return orderCostSourceTypes(['SEA', 'ROAD', 'FUMIGATION']);
  }
  return orderCostSourceTypes(props.costTypes);
});

const tabsKey = computed(() => visibleCostTypes.value.join('-') || 'none');

/** 始终指向当前可见 Tab，避免切换服务类型后 activeKey 失效导致内容空白 */
const activeTab = ref<QuoteCostType>(visibleCostTypes.value[0] ?? 'SEA');

async function syncActiveTab(preferFirst = false) {
  const types = visibleCostTypes.value;
  const first = types[0];
  if (!first) {
    return;
  }
  const next =
    !preferFirst && types.includes(activeTab.value) ? activeTab.value : first;
  activeTab.value = next;
  await nextTick();
  if (visibleCostTypes.value.includes(next)) {
    activeTab.value = next;
  }
}

function tabLabel(type: QuoteCostType) {
  return $t(
    `page.quote.costTabs.${type === 'ROAD' ? 'road' : type === 'SEA' ? 'sea' : 'fumigation'}`,
  );
}

function latestByType(type: QuoteCostType) {
  return props.matches.find((item) => item.costType === type);
}

function listByType(type: QuoteCostType) {
  return props.matches.filter((item) => item.costType === type);
}

const sections = computed(() =>
  visibleCostTypes.value.map((type) => {
    if (type === 'SEA' || type === 'ROAD') {
      const typedMatches = listByType(type);
      return {
        match: typedMatches[0],
        matches: typedMatches,
        type,
      };
    }
    const match = latestByType(type);
    return {
      match,
      matches: match ? [match] : [],
      type,
    };
  }),
);

const activeSection = computed(
  () => sections.value.find((item) => item.type === activeTab.value) ?? null,
);

const activeHasNoData = computed(
  () => (activeSection.value?.matches.length ?? 0) === 0,
);

watch(
  tabsKey,
  () => {
    void syncActiveTab(true);
  },
  { immediate: true, flush: 'sync' },
);

function onImport() {
  emit('import', activeTab.value);
}
</script>

<template>
  <div v-if="sections.length > 0" class="quote-cost-source">
    <Tabs
      :key="tabsKey"
      v-model:active-key="activeTab"
      destroy-inactive-tab-pane
    >
      <!-- 引入按钮放在 Tab 栏最右侧，去掉内容区工具条框 -->
      <template #rightExtra>
        <div class="quote-cost-source__extra">
          <Tag v-if="activeHasNoData" color="default">
            {{ $t('page.quote.message.noCostSnapshot') }}
          </Tag>
          <Button
            v-if="canImport"
            class="quote-cost-source__import-btn"
            size="small"
            @click="onImport"
          >
            <IconifyIcon class="mr-1 size-3.5" icon="lucide:database" />
            {{ $t('page.quote.actions.importCostData') }}
          </Button>
        </div>
      </template>

      <Tabs.TabPane
        v-for="section in sections"
        :key="section.type"
        :tab="tabLabel(section.type)"
      >
        <!-- 表格直接吃 Tab 内容宽，不再套内层 actions 框 -->
        <div class="quote-cost-source__pane">
          <CostSnapshotGrid
            :empty-description="
              $t('page.quote.message.noCostImported', [tabLabel(section.type)])
            "
            :match="section.match"
            :matches="section.matches"
            :type="section.type"
          />
        </div>
      </Tabs.TabPane>
    </Tabs>
  </div>
</template>

<style scoped>
.quote-cost-source {
  width: 100%;
  min-width: 0;
  max-width: 100%;
}

.quote-cost-source :deep(.ant-tabs),
.quote-cost-source :deep(.ant-tabs-content),
.quote-cost-source :deep(.ant-tabs-content-holder),
.quote-cost-source :deep(.ant-tabs-tabpane) {
  width: 100%;
  min-width: 0;
  max-width: 100%;
}

.quote-cost-source :deep(.ant-tabs-nav) {
  margin-bottom: 0;
}

.quote-cost-source :deep(.ant-tabs-nav-wrap) {
  flex: 1;
  min-width: 0;
}

.quote-cost-source__extra {
  display: inline-flex;
  flex-shrink: 0;
  gap: 8px;
  align-items: center;
  margin-left: 12px;
}

.quote-cost-source__pane {
  box-sizing: border-box;
  width: 100%;
  min-width: 0;
  max-width: 100%;

  /* 仅底/侧留白，保证底边线不被卡片圆角裁切；不再套工具条灰框 */
  padding: 12px 0 16px;
  overflow: hidden;
}
</style>
