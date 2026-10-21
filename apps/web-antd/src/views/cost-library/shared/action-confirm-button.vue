<script lang="ts" setup>
import { computed } from 'vue';

import { Button, Popconfirm } from 'ant-design-vue';

import { $t } from '#/locales';

export type ActionConfirmKind =
  | 'confirm'
  | 'copy'
  | 'delete'
  | 'edit'
  | 'renew';

const props = withDefaults(
  defineProps<{
    action: ActionConfirmKind;
    danger?: boolean;
    disabled?: boolean;
    label?: string;
    loading?: boolean;
    /** 覆盖默认确认文案 */
    title?: string;
    type?: 'dashed' | 'default' | 'link' | 'primary' | 'text';
  }>(),
  {
    danger: false,
    disabled: false,
    label: undefined,
    loading: false,
    title: undefined,
    type: 'primary',
  },
);

const emit = defineEmits<{
  confirm: [];
}>();

const TITLE_KEYS: Record<ActionConfirmKind, string> = {
  confirm: 'page.quote.library.confirm.confirmValid',
  copy: 'page.costLibrary.confirm.copy',
  delete: 'page.costLibrary.confirm.delete',
  edit: 'page.costLibrary.confirm.edit',
  renew: 'page.costLibrary.confirm.renew',
};

const popTitle = computed(() => props.title ?? $t(TITLE_KEYS[props.action]));

const buttonLabel = computed(() => props.label ?? $t('common.confirm'));
</script>

<template>
  <Popconfirm
    :cancel-text="$t('common.cancel')"
    :disabled="disabled || loading"
    :get-popup-container="(node) => node?.ownerDocument?.body ?? document.body"
    :ok-text="$t('common.confirm')"
    :title="popTitle"
    @confirm="emit('confirm')"
  >
    <Button
      :danger="danger"
      :disabled="disabled"
      :loading="loading"
      :type="type"
    >
      <slot>{{ buttonLabel }}</slot>
    </Button>
  </Popconfirm>
</template>
