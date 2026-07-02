<script lang="ts" setup>
import type { TemplateLayoutFieldItem } from '../../shared/template-field-model';

import type { CostMode, CostTableTemplateLayout } from '#/api/cost';

import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue';

import { useSortable } from '@vben/hooks';
import { Eye, EyeOff, GripVertical, Plus, UserRoundPen, X } from '@vben/icons';

import { Button, Checkbox, Input, Modal } from 'ant-design-vue';

import { $t } from '#/locales';

import {
  addCatalogField,
  addCustomField,
  applyLayoutFieldItems,
  buildLayoutFieldItems,
  listAvailableCatalogFields,
  removeLayoutField,
  updateLayoutFieldItem,
} from '../../shared/template-field-model';
import { getFieldLabel } from '../../shared/template-layout-utils';

const props = defineProps<{
  mode: CostMode;
}>();

const layout = defineModel<CostTableTemplateLayout>({ required: true });

const listRef = ref<HTMLElement | null>(null);
const sortableInstance = ref<null | { destroy: () => void }>(null);
const isSortableDragging = ref(false);
const editingField = ref<string>();
const customTitle = ref('');
const customModalOpen = ref(false);

const items = computed({
  get: () => buildLayoutFieldItems(props.mode, layout.value),
  set: (value: TemplateLayoutFieldItem[]) => {
    layout.value = applyLayoutFieldItems(props.mode, value, layout.value);
  },
});

const availableFields = computed(() =>
  listAvailableCatalogFields(props.mode, items.value),
);

const visibleItems = computed(() => items.value.filter((item) => item.visible));
const hiddenItems = computed(() => items.value.filter((item) => !item.visible));

function syncItems(next: TemplateLayoutFieldItem[]) {
  items.value = next;
}

function startEdit(field: string) {
  editingField.value = field;
}

function stopEdit() {
  editingField.value = undefined;
}

function onTitleInput(field: string, value: string) {
  syncItems(updateLayoutFieldItem(items.value, field, { title: value }));
}

function onRequiredChange(field: string, checked: boolean) {
  syncItems(updateLayoutFieldItem(items.value, field, { required: checked }));
}

function onToggleVisible(field: string) {
  const target = items.value.find((item) => item.field === field);
  if (!target) {
    return;
  }
  syncItems(
    updateLayoutFieldItem(items.value, field, { visible: !target.visible }),
  );
}

function onRemove(field: string) {
  syncItems(removeLayoutField(items.value, field));
  if (editingField.value === field) {
    stopEdit();
  }
}

function onAddCatalog(field: string) {
  syncItems(addCatalogField(props.mode, items.value, field));
}

function openCustomModal() {
  customTitle.value = '';
  customModalOpen.value = true;
}

function confirmCustomField() {
  const title = customTitle.value.trim();
  if (!title) {
    return;
  }
  syncItems(addCustomField(items.value, title));
  customModalOpen.value = false;
}

async function setupSortable() {
  if (isSortableDragging.value) {
    return;
  }
  sortableInstance.value?.destroy();
  sortableInstance.value = null;
  if (!listRef.value) {
    return;
  }
  const { initializeSortable } = useSortable(listRef.value, {
    animation: 200,
    draggable: '.template-layout-editor__item--draggable',
    handle: '.template-layout-editor__drag-handle',
    onStart: () => {
      isSortableDragging.value = true;
    },
    onEnd: (event) => {
      const { oldIndex, newIndex } = event;
      isSortableDragging.value = false;
      sortableInstance.value?.destroy();
      sortableInstance.value = null;
      if (
        oldIndex === undefined ||
        newIndex === undefined ||
        oldIndex === newIndex
      ) {
        void nextTick(() => setupSortable());
        return;
      }
      const nextVisible = [...visibleItems.value];
      const [moved] = nextVisible.splice(oldIndex, 1);
      if (!moved) {
        void nextTick(() => setupSortable());
        return;
      }
      nextVisible.splice(newIndex, 0, moved);
      syncItems([...nextVisible, ...hiddenItems.value]);
      void nextTick(() => setupSortable());
    },
  });
  sortableInstance.value = await initializeSortable();
}

watch(
  () => visibleItems.value.length,
  async () => {
    await nextTick();
    await setupSortable();
  },
  { immediate: true },
);

onBeforeUnmount(() => {
  sortableInstance.value?.destroy();
});
</script>

<template>
  <div class="template-layout-editor">
    <p class="template-layout-editor__hint">
      {{ $t('page.costLibrary.template.layoutHintAdvanced') }}
    </p>

    <div class="template-layout-editor__toolbar">
      <Button size="small" type="dashed" @click="openCustomModal">
        <Plus class="size-4" />
        {{ $t('page.costLibrary.template.addCustomField') }}
      </Button>
    </div>

    <div class="template-layout-editor__panel">
      <p class="template-layout-editor__section-label">
        {{ $t('page.costLibrary.template.selectedColumns') }}
        <span class="template-layout-editor__section-count">
          {{ visibleItems.length }}
        </span>
      </p>

      <ul ref="listRef" class="template-layout-editor__list">
        <li
          v-for="(item, index) in visibleItems"
          :key="item.field"
          class="template-layout-editor__item template-layout-editor__item--selected template-layout-editor__item--draggable"
          @dblclick="startEdit(item.field)"
        >
          <button
            class="template-layout-editor__drag-handle"
            type="button"
            :aria-label="$t('page.costLibrary.template.dragSort')"
          >
            <GripVertical class="size-4" />
          </button>

          <span class="template-layout-editor__order">{{ index + 1 }}</span>

          <div class="template-layout-editor__content">
            <template v-if="editingField === item.field">
              <Input
                autofocus
                class="template-layout-editor__title-input"
                size="small"
                :placeholder="getFieldLabel(mode, item.field)"
                :value="item.title"
                @blur="stopEdit"
                @press-enter="stopEdit"
                @update:value="(value) => onTitleInput(item.field, value)"
              />
              <label class="template-layout-editor__required">
                <Checkbox
                  :checked="item.required"
                  @change="
                    (e) => onRequiredChange(item.field, e.target.checked)
                  "
                />
                {{ $t('page.costLibrary.template.requiredField') }}
              </label>
            </template>
            <template v-else>
              <div class="template-layout-editor__title-row">
                <span class="template-layout-editor__label">
                  <span
                    v-if="item.required"
                    class="template-layout-editor__required-mark"
                    >*</span>
                  {{ item.title }}
                </span>
                <span v-if="item.isCustom" class="template-layout-editor__tag">
                  {{ $t('page.costLibrary.template.customFieldTag') }}
                </span>
              </div>
              <span
                v-if="item.isCustom"
                class="template-layout-editor__field-code"
              >
                {{ item.field }}
              </span>
            </template>
          </div>

          <div class="template-layout-editor__actions">
            <Button
              :aria-label="$t('page.costLibrary.template.editColumn')"
              size="small"
              type="text"
              @click="startEdit(item.field)"
            >
              <UserRoundPen class="size-4" />
            </Button>
            <Button
              :aria-label="$t('page.costLibrary.template.hideColumn')"
              size="small"
              type="text"
              @click="onToggleVisible(item.field)"
            >
              <EyeOff class="size-4" />
            </Button>
            <Button
              :aria-label="$t('page.costLibrary.template.removeColumn')"
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

      <template v-if="hiddenItems.length">
        <div class="template-layout-editor__divider"></div>
        <p class="template-layout-editor__section-label">
          {{ $t('page.costLibrary.template.hiddenColumns') }}
        </p>
        <ul class="template-layout-editor__list">
          <li
            v-for="item in hiddenItems"
            :key="`hidden-${item.field}`"
            class="template-layout-editor__item template-layout-editor__item--hidden"
          >
            <span class="template-layout-editor__label">{{ item.title }}</span>
            <div class="template-layout-editor__actions">
              <Button
                :aria-label="$t('page.costLibrary.template.showColumn')"
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
      </template>

      <template v-if="availableFields.length">
        <div class="template-layout-editor__divider"></div>
        <p class="template-layout-editor__section-label">
          {{ $t('page.costLibrary.template.availableColumns') }}
        </p>
        <ul class="template-layout-editor__list">
          <li
            v-for="entry in availableFields"
            :key="`avail-${entry.field}`"
            class="template-layout-editor__item"
          >
            <span class="template-layout-editor__label">
              {{ getFieldLabel(mode, entry.field) }}
            </span>
            <Button size="small" type="text" @click="onAddCatalog(entry.field)">
              <Plus class="size-4" />
            </Button>
          </li>
        </ul>
      </template>
    </div>

    <Modal
      v-model:open="customModalOpen"
      :title="$t('page.costLibrary.template.addCustomField')"
      @ok="confirmCustomField"
    >
      <Input
        v-model:value="customTitle"
        :placeholder="
          $t('page.costLibrary.template.customFieldNamePlaceholder')
        "
        @press-enter="confirmCustomField"
      />
    </Modal>
  </div>
</template>
