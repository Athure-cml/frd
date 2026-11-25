<script lang="ts" setup>
import { computed, ref, watch } from 'vue';

import { CircleHelp } from '@vben/icons';

import { Switch, Textarea, Tooltip } from 'ant-design-vue';

const props = withDefaults(
  defineProps<{
    disabled?: boolean;
    help?: string;
    label?: string;
    maxlength?: number;
    value?: null | string;
  }>(),
  {
    disabled: false,
    help: '',
    label: 'REMARK',
    maxlength: 512,
    value: '',
  },
);

const emit = defineEmits<{
  'update:value': [string];
}>();

function hasRemarkText(v: unknown) {
  return v !== null && v !== undefined && String(v).trim() !== '';
}

const enabled = ref(hasRemarkText(props.value));

// 编辑回填后打开开关；immediate 覆盖首屏异步 setValues
watch(
  () => props.value,
  (v) => {
    if (hasRemarkText(v)) {
      enabled.value = true;
    }
  },
  { immediate: true },
);

const text = computed({
  get: () => props.value ?? '',
  set: (v: string) => emit('update:value', v ?? ''),
});

function onToggle(checked: boolean) {
  enabled.value = checked;
  if (!checked) {
    emit('update:value', '');
  }
}
</script>

<template>
  <div class="road-remark-field w-full">
    <div class="mb-1 flex h-6 items-center gap-2">
      <span class="shrink-0 leading-none">{{ label }}</span>
      <Tooltip v-if="help" :title="help">
        <CircleHelp
          class="text-muted-foreground size-3.5 shrink-0 cursor-help"
        />
      </Tooltip>
      <span class="inline-flex h-full items-center">
        <Switch
          size="small"
          :checked="enabled"
          :disabled="disabled"
          @update:checked="onToggle"
        />
      </span>
    </div>
    <Textarea
      v-if="enabled"
      v-model:value="text"
      class="w-full"
      :disabled="disabled"
      :maxlength="maxlength"
      :rows="4"
      show-count
    />
  </div>
</template>

<style scoped>
.road-remark-field :deep(.ant-switch) {
  margin-inline: 0;
  vertical-align: middle;
}
</style>
