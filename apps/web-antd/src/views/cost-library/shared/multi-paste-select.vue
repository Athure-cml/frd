<script lang="ts" setup>
import type { SelectProps } from 'ant-design-vue';

import { computed, useAttrs } from 'vue';

import { ApiComponent } from '@vben/common-ui';

import { Select } from 'ant-design-vue';

import { $t } from '#/locales';

defineOptions({ name: 'MultiPasteSelect', inheritAttrs: false });

const props = withDefaults(
  defineProps<{ modelValue?: SelectProps['value'] }>(),
  { modelValue: undefined },
);

const emit = defineEmits<{ 'update:modelValue': [unknown] }>();

const attrs = useAttrs();

function handleUpdate(val: unknown) {
  emit('update:modelValue', val);
}

/**
 * 多值粘贴分隔符：换行 / 制表符 / 英文分号 / 全角分号 / 顿号 / 全角逗号。
 * 故意不含英文逗号——港口名本身带逗号（如 NEW YORK, NY）。
 */
const PASTE_SEPARATOR = /[\n\r\t;；、，]+/;

const placeholder = computed(
  () => (attrs.placeholder as string) || $t('ui.placeholder.select'),
);

function splitPasted(text: string) {
  return text
    .split(PASTE_SEPARATOR)
    .map((item) => item.trim())
    .filter(Boolean);
}

/**
 * 接管多值粘贴：阻止默认插入，直接把拆分后的内容合并进 value。
 * 否则 antd 会把整串原文留在搜索框里（分词时清空搜索值的分支不生效），
 * 表现为「已经变成 +N 个标签，输入框里还残留一整串文本」。
 */
function handlePaste(event: ClipboardEvent) {
  const text = event.clipboardData?.getData('text') ?? '';
  if (!text) {
    return;
  }
  const tokens = splitPasted(text);
  // 单条粘贴交回默认行为（进入搜索框，可按关键字搜索）
  if (tokens.length < 2) {
    return;
  }
  event.preventDefault();
  event.stopPropagation();
  const current = Array.isArray(props.modelValue) ? props.modelValue : [];
  const merged = [...current];
  for (const token of tokens) {
    if (!merged.includes(token)) {
      merged.push(token);
    }
  }
  emit('update:modelValue', merged);
}
</script>

<template>
  <div class="w-full" @paste.capture="handlePaste">
    <ApiComponent
      v-bind="attrs"
      :component="Select"
      loading-slot="suffixIcon"
      model-prop-name="value"
      :model-value="props.modelValue"
      :placeholder="placeholder"
      visible-event="onVisibleChange"
      @update:model-value="handleUpdate"
    />
  </div>
</template>
