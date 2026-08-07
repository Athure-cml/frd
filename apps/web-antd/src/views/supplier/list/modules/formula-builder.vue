<script lang="ts" setup>
import type { FormulaBuilderVariant } from '#/views/cost-library/road/formula-eval';

import { computed, nextTick, ref, watch } from 'vue';

import { Button, Textarea } from 'ant-design-vue';

import { $t } from '#/locales';
import {
  builderFieldsForVariant,
  validateRoadFormula,
} from '#/views/cost-library/road/formula-eval';

defineOptions({ name: 'FormulaBuilder', inheritAttrs: false });

const props = withDefaults(
  defineProps<{
    disabled?: boolean;
    placeholder?: string;
    value?: string;
    variant?: FormulaBuilderVariant;
  }>(),
  {
    placeholder: undefined,
    value: undefined,
    variant: 'nonFumigation',
  },
);

const emit = defineEmits<{
  blur: [];
  change: [string];
  'update:value': [string];
}>();

const draft = ref('');
const inputRef = ref<{
  $el?: HTMLElement;
  focus?: () => void;
  resizableTextArea?: { textArea?: HTMLTextAreaElement };
}>();

const paletteFields = computed(() => builderFieldsForVariant(props.variant));

const validation = computed(() => validateRoadFormula(draft.value));

const statusClass = computed(() => {
  if (!draft.value.trim()) {
    return 'is-empty';
  }
  return validation.value.ok ? 'is-valid' : 'is-invalid';
});

const statusText = computed(() => {
  if (!draft.value.trim()) {
    return $t('page.supplier.formula.empty');
  }
  if (validation.value.ok) {
    return $t('page.supplier.formula.valid');
  }
  return $t('page.supplier.formula.invalid', [validation.value.message ?? '']);
});

function emitFormula(next: string) {
  emit('update:value', next);
  emit('change', next);
}

function onInput(event: Event) {
  const target = event.target as HTMLTextAreaElement;
  draft.value = target.value;
  emitFormula(draft.value);
}

function getTextArea(): HTMLTextAreaElement | null {
  const el = inputRef.value?.resizableTextArea?.textArea;
  if (el) {
    return el;
  }
  const root = inputRef.value?.$el as HTMLElement | undefined;
  return root?.querySelector?.('textarea') ?? null;
}

function insertField(token: string) {
  if (props.disabled) {
    return;
  }
  const textarea = getTextArea();
  const current = draft.value ?? '';
  let start = current.length;
  let end = current.length;
  if (textarea) {
    start = textarea.selectionStart ?? current.length;
    end = textarea.selectionEnd ?? current.length;
  }

  const before = current.slice(0, start);
  const after = current.slice(end);
  const leftTrim = before.replaceAll(/\s+$/g, '');
  const needPlus = leftTrim.length > 0 && !/[+\-*/(]$/.test(leftTrim);
  const insert = `${needPlus ? '+' : ''}${token}`;
  const next = `${before}${insert}${after}`;
  draft.value = next;
  emitFormula(next);

  const cursor = start + insert.length;
  void nextTick(() => {
    const area = getTextArea();
    if (!area) {
      return;
    }
    area.focus();
    area.setSelectionRange(cursor, cursor);
  });
}

watch(
  () => props.value,
  (next) => {
    if ((next ?? '') === draft.value) {
      return;
    }
    draft.value = next ?? '';
  },
  { immediate: true },
);
</script>

<template>
  <div
    class="formula-builder"
    :class="{ 'formula-builder--disabled': disabled }"
  >
    <div class="formula-builder__section">
      <div class="formula-builder__label">
        {{ $t('page.supplier.formula.fields') }}
      </div>
      <div class="formula-builder__palette">
        <Button
          v-for="field in paletteFields"
          :key="field"
          class="formula-builder__field-btn"
          :class="{
            'formula-builder__field-btn--package':
              field === '非熏蒸打包价' || field === '熏蒸打包价（非橡木）',
          }"
          :disabled="disabled"
          size="small"
          @click="insertField(field)"
        >
          {{ field }}
        </Button>
      </div>
    </div>

    <Textarea
      ref="inputRef"
      :disabled="disabled"
      :placeholder="placeholder || $t('page.supplier.formula.placeholder')"
      :rows="3"
      :value="draft"
      @blur="emit('blur')"
      @input="onInput"
    />

    <div class="formula-builder__status" :class="statusClass">
      {{ statusText }}
    </div>

    <div class="formula-builder__hint">
      <template v-if="variant === 'fumigationNonOak'">
        {{ $t('page.supplier.formula.refNonFumigationHint') }}
      </template>
      <template v-else-if="variant === 'fumigationOak'">
        {{ $t('page.supplier.formula.refFumigationNonOakHint') }}
      </template>
      <template v-else>
        {{ $t('page.supplier.formula.typeOpsHint') }}
      </template>
    </div>
  </div>
</template>

<style scoped>
.formula-builder {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;
}

.formula-builder__section {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.formula-builder__label {
  font-size: 12px;
  font-weight: 500;
  color: hsl(var(--foreground) / 75%);
}

.formula-builder__palette {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.formula-builder__field-btn {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 12px;
}

.formula-builder__field-btn--package {
  font-family: inherit;
  font-weight: 500;
  color: hsl(var(--primary));
  border-color: color-mix(in srgb, hsl(var(--primary)) 40%, transparent);
}

.formula-builder__status {
  font-size: 12px;
}

.formula-builder__status.is-empty {
  color: hsl(var(--muted-foreground));
}

.formula-builder__status.is-valid {
  color: #389e0d;
}

.formula-builder__status.is-invalid {
  color: #cf1322;
}

.formula-builder__hint {
  font-size: 12px;
  line-height: 1.5;
  color: hsl(var(--muted-foreground));
}

.formula-builder--disabled {
  pointer-events: none;
  opacity: 0.72;
}
</style>
