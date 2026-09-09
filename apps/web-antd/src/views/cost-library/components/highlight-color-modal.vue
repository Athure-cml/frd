<script lang="ts" setup>
import type { CostMode } from '#/api/cost';

import { computed, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import { Button, Input, message } from 'ant-design-vue';

import { markCostHighlight } from '#/api/cost/highlight';
import { $t } from '#/locales';

import {
  COLUMN_BG_PRESETS,
  normalizeColumnBgColor,
} from '../shared/column-bg-style';

const props = defineProps<{
  mode: CostMode;
}>();

const emit = defineEmits<{ success: [] }>();

const selectedIds = ref<number[]>([]);
const submitting = ref(false);
const customColor = ref('#E8F1FC');
const selectedColor = ref('#E8F1FC');
const remark = ref('');

const presetColors = computed(() =>
  COLUMN_BG_PRESETS.map((item) => ({
    color: item.color,
    label: $t(item.labelKey),
  })),
);

const [Modal, modalApi] = useVbenModal({
  async onConfirm() {
    await handleConfirm();
  },
  onOpenChange(isOpen) {
    if (!isOpen) {
      selectedIds.value = [];
      remark.value = '';
      selectedColor.value = '#E8F1FC';
      customColor.value = '#E8F1FC';
    }
  },
});

function open(ids: number[]) {
  selectedIds.value = ids;
  modalApi.open();
}

function pickColor(color: string) {
  selectedColor.value = color;
  customColor.value = color;
}

function onCustomColorInput(value: string) {
  customColor.value = value;
  const normalized = normalizeColumnBgColor(value);
  if (normalized) {
    selectedColor.value = normalized;
  }
}

async function handleConfirm() {
  if (selectedIds.value.length === 0) {
    return;
  }
  const color = normalizeColumnBgColor(selectedColor.value);
  if (!color) {
    message.warning($t('page.costLibrary.highlight.invalidColor'));
    return;
  }
  submitting.value = true;
  try {
    await markCostHighlight(props.mode, {
      color,
      ids: selectedIds.value,
      remark: remark.value.trim() || undefined,
    });
    message.success($t('page.costLibrary.highlight.markSuccess'));
    modalApi.close();
    emit('success');
  } finally {
    submitting.value = false;
  }
}

defineExpose({ open });
</script>

<template>
  <Modal
    :confirm-loading="submitting"
    :title="$t('page.costLibrary.highlight.markTitle')"
  >
    <p class="mb-3 text-sm text-muted-foreground">
      {{ $t('page.costLibrary.highlight.markDesc', [selectedIds.length]) }}
    </p>
    <div class="mb-4">
      <div class="mb-2 text-sm font-medium">
        {{ $t('page.costLibrary.highlight.pickColor') }}
      </div>
      <div class="flex flex-wrap gap-2">
        <button
          v-for="preset in presetColors"
          :key="preset.color"
          type="button"
          class="cost-highlight-swatch"
          :class="{
            'cost-highlight-swatch--active': selectedColor === preset.color,
          }"
          :style="{ backgroundColor: preset.color }"
          :title="preset.label"
          @click="pickColor(preset.color)"
        ></button>
      </div>
    </div>
    <div class="mb-4 flex items-center gap-2">
      <span class="text-sm">{{
        $t('page.costLibrary.highlight.customColor')
      }}</span>
      <Input
        :value="customColor"
        class="max-w-[140px]"
        placeholder="#RRGGBB"
        @update:value="onCustomColorInput"
      />
      <input
        :value="customColor"
        class="h-8 w-10 cursor-pointer rounded border border-border"
        type="color"
        @input="onCustomColorInput(($event.target as HTMLInputElement).value)"
      />
    </div>
    <div>
      <div class="mb-2 text-sm font-medium">
        {{ $t('page.costLibrary.highlight.remarkOptional') }}
      </div>
      <Input
        v-model:value="remark"
        :maxlength="128"
        :placeholder="$t('page.costLibrary.highlight.remarkPlaceholder')"
      />
    </div>
    <template #footer>
      <Button @click="modalApi.close()">{{ $t('common.cancel') }}</Button>
      <Button :loading="submitting" type="primary" @click="handleConfirm">
        {{ $t('common.confirm') }}
      </Button>
    </template>
  </Modal>
</template>

<style scoped>
.cost-highlight-swatch {
  width: 2rem;
  height: 2rem;
  cursor: pointer;
  border: 2px solid transparent;
  border-radius: 0.375rem;
  transition: border-color 0.15s ease;
}

.cost-highlight-swatch--active {
  border-color: hsl(var(--primary));
  box-shadow: 0 0 0 1px hsl(var(--primary));
}
</style>
