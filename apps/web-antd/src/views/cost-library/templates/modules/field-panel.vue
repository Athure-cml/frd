<script lang="ts" setup>
import type { TemplateLayoutFieldItem } from '../../shared/template-field-model';

import type { CostMode, CostTableTemplateLayout } from '#/api/cost';

import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue';

import { useSortable } from '@vben/hooks';
import { Eye, GripVertical, Plus, Search, X } from '@vben/icons';

import {
  Button,
  Checkbox,
  Collapse,
  Input,
  InputNumber,
  Select,
  Switch,
} from 'ant-design-vue';

import { $t } from '#/locales';

import {
  addFieldFromLibrary,
  applyLayoutFieldItems,
  buildLayoutFieldItems,
  listLibraryFields,
  removeLayoutField,
  removeStagedCustomField,
  stageCustomField,
  updateLayoutFieldItem,
} from '../../shared/template-field-model';
import { matchesTemplateFieldSearch } from '../../shared/template-layout-utils';

const props = defineProps<{
  mode: CostMode;
}>();

const layout = defineModel<CostTableTemplateLayout>({ required: true });

const keyword = ref('');
const customTitle = ref('');
const libraryOpen = ref<string[]>([]);
const selectedOpen = ref(['selected']);

const isSearching = computed(() => keyword.value.trim().length > 0);

const selectedListRef = ref<HTMLElement | null>(null);
const sortableSelected = ref<null | { destroy: () => void }>(null);
let sortableSetupToken = 0;
const isSortableDragging = ref(false);
let pendingSortableSetup = false;

function markDragStart() {
  isSortableDragging.value = true;
}

function markDragEnd() {
  isSortableDragging.value = false;
  if (pendingSortableSetup) {
    pendingSortableSetup = false;
    void scheduleSortableSetup();
  }
}

function requestSortableSetup() {
  if (isSortableDragging.value) {
    pendingSortableSetup = true;
    return;
  }
  void scheduleSortableSetup();
}

async function scheduleSortableSetup() {
  if (isSortableDragging.value) {
    pendingSortableSetup = true;
    return;
  }
  await setupSortable();
}

function destroySortable() {
  sortableSelected.value?.destroy();
  sortableSelected.value = null;
}

function isPanelOpen(key: string, activeKeys: string[]) {
  return activeKeys.includes(key);
}

function isConnectedElement(element: HTMLElement | null | undefined) {
  return !!element?.isConnected;
}

const items = computed({
  get: () => buildLayoutFieldItems(props.mode, layout.value),
  set: (value: TemplateLayoutFieldItem[]) => {
    layout.value = applyLayoutFieldItems(props.mode, value, layout.value);
  },
});

const filteredLibrary = computed(() => {
  const available = listLibraryFields(props.mode, layout.value);
  const q = keyword.value;
  return available.filter((entry) =>
    matchesTemplateFieldSearch(props.mode, q, entry.field, entry.title),
  );
});

const visibleItems = computed(() => items.value.filter((item) => item.visible));
const hiddenItems = computed(() => items.value.filter((item) => !item.visible));

const filteredVisibleItems = computed(() => {
  const q = keyword.value;
  return visibleItems.value.filter((item) =>
    matchesTemplateFieldSearch(props.mode, q, item.field, item.title),
  );
});

const filteredHiddenItems = computed(() => {
  const q = keyword.value;
  return hiddenItems.value.filter((item) =>
    matchesTemplateFieldSearch(props.mode, q, item.field, item.title),
  );
});

const fixedOptions = [
  { label: $t('page.costLibrary.template.fixedLeft'), value: 'left' },
  { label: $t('page.costLibrary.template.fixedRight'), value: 'right' },
];

function syncItems(next: TemplateLayoutFieldItem[]) {
  items.value = next;
}

function patchItem(field: string, patch: Partial<TemplateLayoutFieldItem>) {
  syncItems(updateLayoutFieldItem(items.value, field, patch));
}

function onAddFromLibrary(field: string) {
  syncItems(addFieldFromLibrary(props.mode, items.value, field, layout.value));
}

function onAddCustom() {
  const title = customTitle.value.trim();
  if (!title) {
    return;
  }
  layout.value = stageCustomField(layout.value, title);
  customTitle.value = '';
}

function onRemoveFromLibrary(field: string, isCustom: boolean) {
  if (!isCustom) {
    return;
  }
  layout.value = removeStagedCustomField(layout.value, field);
}

function onRemove(field: string) {
  syncItems(removeLayoutField(items.value, field));
}

function onToggleVisible(field: string) {
  const item = items.value.find((row) => row.field === field);
  if (item) {
    patchItem(field, { visible: !item.visible });
  }
}

function onShowAllHidden() {
  syncItems(
    items.value.map((item) =>
      item.visible ? item : { ...item, visible: true },
    ),
  );
}

function handleSelectedReorder(event: {
  newIndex?: number;
  oldIndex?: number;
}) {
  const { oldIndex, newIndex } = event;
  if (
    oldIndex === undefined ||
    newIndex === undefined ||
    oldIndex === newIndex
  ) {
    return;
  }

  const visible = [...visibleItems.value];
  const [moved] = visible.splice(oldIndex, 1);
  if (!moved) {
    return;
  }
  visible.splice(newIndex, 0, moved);
  syncItems([...visible, ...hiddenItems.value]);
}

async function setupSortable() {
  if (isSortableDragging.value) {
    pendingSortableSetup = true;
    return;
  }
  const token = ++sortableSetupToken;
  destroySortable();

  await nextTick();
  if (token !== sortableSetupToken || isSortableDragging.value) {
    return;
  }

  const selectedEl = selectedListRef.value;
  if (
    isSearching.value ||
    !isPanelOpen('selected', selectedOpen.value) ||
    !isConnectedElement(selectedEl) ||
    filteredVisibleItems.value.length < 2
  ) {
    return;
  }

  try {
    const { initializeSortable } = useSortable(selectedEl!, {
      animation: 180,
      draggable: '.tpl-field-row--draggable',
      handle: '.tpl-field-row__drag',
      onStart: markDragStart,
      onEnd: (event) => {
        const { oldIndex, newIndex } = event;
        markDragEnd();
        destroySortable();
        handleSelectedReorder({ newIndex, oldIndex });
        void nextTick(() => scheduleSortableSetup());
      },
    });
    const instance = await initializeSortable();
    if (token !== sortableSetupToken || isSortableDragging.value) {
      instance?.destroy();
      return;
    }
    sortableSelected.value = instance;
  } catch {
    sortableSelected.value = null;
  }
}

watch(keyword, (value) => {
  if (!value.trim()) {
    return;
  }
  if (!libraryOpen.value.includes('library')) {
    libraryOpen.value = [...libraryOpen.value, 'library'];
  }
  if (!selectedOpen.value.includes('selected')) {
    selectedOpen.value = [...selectedOpen.value, 'selected'];
  }
});

watch(
  () => [
    isSearching.value,
    selectedOpen.value.join(','),
    props.mode,
    filteredVisibleItems.value.length,
  ],
  () => {
    requestSortableSetup();
  },
  { immediate: true },
);

onBeforeUnmount(() => {
  sortableSetupToken += 1;
  destroySortable();
});
</script>

<template>
  <div class="tpl-field-panel">
    <div class="tpl-field-panel__toolbar">
      <div class="tpl-card tpl-field-panel__search">
        <Input
          v-model:value="keyword"
          allow-clear
          :placeholder="$t('page.costLibrary.template.searchFieldPlaceholder')"
        >
          <template #prefix>
            <Search class="size-4 text-muted-foreground" />
          </template>
        </Input>
      </div>

      <div class="tpl-card">
        <div class="tpl-card__head">
          <span>{{ $t('page.costLibrary.template.addCustomField') }}</span>
        </div>
        <div class="tpl-card__body tpl-field-panel__custom">
          <Input
            v-model:value="customTitle"
            size="small"
            :placeholder="
              $t('page.costLibrary.template.customFieldNamePlaceholder')
            "
            @press-enter="onAddCustom"
          />
          <Button size="small" type="primary" @click="onAddCustom">
            <Plus class="size-4" />
          </Button>
        </div>
      </div>
    </div>

    <div class="tpl-field-panel__scroll">
      <Collapse v-model:active-key="libraryOpen" class="tpl-collapse" ghost>
        <Collapse.Panel key="library">
          <template #header>
            <span class="tpl-collapse__title">
              {{ $t('page.costLibrary.template.fieldLibrary') }}
              <span class="tpl-collapse__count">{{
                filteredLibrary.length
              }}</span>
            </span>
          </template>
          <ul class="tpl-library-list">
            <li
              v-for="entry in filteredLibrary"
              :key="entry.field"
              class="tpl-library-item"
              :class="{ 'tpl-library-item--custom': entry.isCustom }"
              :data-field="entry.field"
            >
              <span class="tpl-library-item__label">
                {{ entry.title }}
                <span v-if="entry.isCustom" class="tpl-library-item__tag">
                  {{ $t('page.costLibrary.template.customFieldTag') }}
                </span>
              </span>
              <Button
                v-if="entry.isCustom"
                danger
                size="small"
                type="text"
                @click.stop="onRemoveFromLibrary(entry.field, entry.isCustom)"
              >
                <X class="size-4" />
              </Button>
              <Button
                size="small"
                type="text"
                @click.stop="onAddFromLibrary(entry.field)"
              >
                <Plus class="size-4" />
              </Button>
            </li>
          </ul>
          <p v-if="filteredLibrary.length === 0" class="tpl-empty">
            {{
              isSearching
                ? $t('page.costLibrary.template.noSearchResults')
                : $t('page.costLibrary.template.noAvailableFields')
            }}
          </p>
        </Collapse.Panel>
      </Collapse>

      <Collapse v-model:active-key="selectedOpen" class="tpl-collapse" ghost>
        <Collapse.Panel key="selected">
          <template #header>
            <span class="tpl-collapse__title">
              {{ $t('page.costLibrary.template.selectedColumns') }}
              <span class="tpl-collapse__count">
                {{
                  isSearching
                    ? `${filteredVisibleItems.length}/${items.length}`
                    : items.length
                }}
              </span>
            </span>
          </template>

          <div class="tpl-batch-bar">
            <Button size="small" type="link" @click="onShowAllHidden">
              {{ $t('page.costLibrary.template.showAll') }}
            </Button>
          </div>

          <ul ref="selectedListRef" class="tpl-field-list">
            <li
              v-for="(item, index) in filteredVisibleItems"
              :key="item.field"
              class="tpl-field-row tpl-field-row--draggable"
              :class="{ 'tpl-field-row--custom': item.isCustom }"
              :data-field="item.field"
            >
              <button class="tpl-field-row__drag" type="button">
                <GripVertical class="size-4" />
              </button>
              <span class="tpl-field-row__order">{{ index + 1 }}</span>

              <div class="tpl-field-row__main">
                <Input
                  size="small"
                  :value="item.title"
                  @update:value="(v) => patchItem(item.field, { title: v })"
                />
                <div class="tpl-field-row__meta">
                  <div class="tpl-field-row__size">
                    <InputNumber
                      class="tpl-field-row__width"
                      size="small"
                      :min="60"
                      :placeholder="$t('page.costLibrary.template.columnWidth')"
                      :value="item.width"
                      @update:value="
                        (v) =>
                          patchItem(item.field, {
                            width: Number(v) || undefined,
                          })
                      "
                    />
                    <Select
                      allow-clear
                      class="tpl-field-row__fixed"
                      size="small"
                      :options="fixedOptions"
                      :placeholder="$t('page.costLibrary.template.fixedNone')"
                      :value="item.fixed"
                      @update:value="
                        (v) =>
                          patchItem(item.field, {
                            fixed: v as TemplateLayoutFieldItem['fixed'],
                          })
                      "
                    />
                  </div>
                  <label class="tpl-field-row__switch">
                    <Switch
                      size="small"
                      :checked="item.visible"
                      @change="
                        (checked) =>
                          patchItem(item.field, { visible: Boolean(checked) })
                      "
                    />
                    <span>{{ $t('page.costLibrary.template.visible') }}</span>
                  </label>
                  <label class="tpl-field-row__check">
                    <Checkbox
                      :checked="item.required"
                      @change="
                        (e) =>
                          patchItem(item.field, { required: e.target.checked })
                      "
                    />
                    <span>{{
                      $t('page.costLibrary.template.requiredField')
                    }}</span>
                  </label>
                </div>
              </div>

              <Button
                danger
                size="small"
                type="text"
                @click="onRemove(item.field)"
              >
                <X class="size-4" />
              </Button>
            </li>
          </ul>
          <p
            v-if="isSearching && filteredVisibleItems.length === 0"
            class="tpl-empty"
          >
            {{ $t('page.costLibrary.template.noSearchResults') }}
          </p>

          <div v-if="filteredHiddenItems.length" class="tpl-hidden-block">
            <p class="tpl-hidden-block__title">
              {{ $t('page.costLibrary.template.hiddenColumns') }}
              ({{ filteredHiddenItems.length }})
            </p>
            <ul class="tpl-hidden-list">
              <li v-for="item in filteredHiddenItems" :key="`h-${item.field}`">
                <span>{{ item.title }}</span>
                <div class="tpl-hidden-list__actions">
                  <Button
                    size="small"
                    type="text"
                    @click="onToggleVisible(item.field)"
                  >
                    <Eye class="size-4" />
                  </Button>
                  <Button
                    danger
                    size="small"
                    type="text"
                    @click="onRemove(item.field)"
                  >
                    <X class="size-4" />
                  </Button>
                </div>
              </li>
            </ul>
          </div>
        </Collapse.Panel>
      </Collapse>
    </div>
  </div>
</template>
