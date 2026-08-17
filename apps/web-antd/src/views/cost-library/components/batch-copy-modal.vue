<script lang="ts" setup>
import type { CostMode } from '#/api/cost';

import { computed, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import { Button, message } from 'ant-design-vue';

import { useVbenForm } from '#/adapter/form';
import { batchCopyRoadCost, seaCostApi } from '#/api/cost';
import { $t } from '#/locales';

import {
  joinContainerTypes,
  useSeaBatchCopySchema,
} from '../shared/freight-schema';

const props = withDefaults(
  defineProps<{
    mode?: Extract<CostMode, 'road' | 'sea'>;
  }>(),
  { mode: 'road' },
);

const emit = defineEmits<{ success: [] }>();

const selectedIds = ref<number[]>([]);
const submitting = ref(false);

const isSea = computed(() => props.mode === 'sea');

const roadSchema = [
  {
    component: 'InputNumber',
    componentProps: {
      addonAfter: '%',
      class: 'w-full',
      min: 0,
      precision: 2,
    },
    fieldName: 'fsc',
    label: $t('page.costLibrary.roadFields.fsc'),
  },
  {
    component: 'DatePicker',
    componentProps: {
      class: 'w-full',
      format: 'YYYY-MM-DD',
      valueFormat: 'YYYY-MM-DD',
    },
    fieldName: 'validDate',
    label: $t('page.costLibrary.roadFields.validDate'),
  },
];

const [Form, formApi] = useVbenForm({
  layout: 'vertical',
  schema: isSea.value ? useSeaBatchCopySchema() : roadSchema,
  showDefaultActions: false,
  wrapperClass: isSea.value ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1',
});

const [Modal, modalApi] = useVbenModal({
  footer: false,
  onOpenChange(isOpen) {
    if (!isOpen) {
      formApi.resetForm();
      selectedIds.value = [];
    }
  },
});

function optionalNumber(value: unknown): number | undefined {
  if (value === null || value === undefined || value === '') {
    return undefined;
  }
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function optionalDate(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function hasSeaOverrides(values: Record<string, unknown>) {
  return (
    optionalNumber(values.freight) !== undefined ||
    !!joinContainerTypes(values.containerType as string | string[]) ||
    !!optionalDate(values.freightEffDate) ||
    !!optionalDate(values.freightValidDate) ||
    optionalNumber(values.buc) !== undefined ||
    !!optionalDate(values.bucEffDate) ||
    !!optionalDate(values.bucValidDate) ||
    optionalNumber(values.others) !== undefined ||
    !!optionalDate(values.othersEffDate) ||
    !!optionalDate(values.othersValidDate)
  );
}

async function submitCopy(applyOverrides: boolean) {
  if (selectedIds.value.length === 0) {
    return;
  }
  const values = await formApi.getValues();

  if (isSea.value) {
    if (applyOverrides && !hasSeaOverrides(values)) {
      message.warning($t('page.costLibrary.hint.batchCopyNeedFieldsSea'));
      return;
    }
    submitting.value = true;
    modalApi.lock();
    try {
      const result = await seaCostApi.batchCopy({
        applyOverrides,
        buc: optionalNumber(values.buc),
        bucEffDate: optionalDate(values.bucEffDate),
        bucValidDate: optionalDate(values.bucValidDate),
        containerType: joinContainerTypes(
          values.containerType as string | string[],
        ),
        freight: optionalNumber(values.freight),
        freightEffDate: optionalDate(values.freightEffDate),
        freightValidDate: optionalDate(values.freightValidDate),
        ids: selectedIds.value,
        others: optionalNumber(values.others),
        othersEffDate: optionalDate(values.othersEffDate),
        othersValidDate: optionalDate(values.othersValidDate),
      });
      message.success(
        $t('page.costLibrary.hint.batchCopySuccess', [result.created]),
      );
      emit('success');
      modalApi.close();
    } finally {
      submitting.value = false;
      modalApi.unlock();
    }
    return;
  }

  const fsc = optionalNumber(values.fsc);
  const validDate = optionalDate(values.validDate);
  if (applyOverrides && fsc === undefined && !validDate) {
    message.warning($t('page.costLibrary.hint.batchCopyNeedFields'));
    return;
  }

  submitting.value = true;
  modalApi.lock();
  try {
    const result = await batchCopyRoadCost({
      applyOverrides,
      fsc,
      ids: selectedIds.value,
      validDate,
    });
    message.success(
      $t('page.costLibrary.hint.batchCopySuccess', [result.created]),
    );
    emit('success');
    modalApi.close();
  } finally {
    submitting.value = false;
    modalApi.unlock();
  }
}

function open(ids: number[]) {
  selectedIds.value = ids;
  modalApi.open();
}

defineExpose({ open });
</script>

<template>
  <Modal
    :class="isSea ? 'w-full sm:w-[720px]' : 'w-full sm:w-[480px]'"
    :title="$t('page.costLibrary.actions.batchCopy')"
  >
    <p class="mb-1 text-sm font-medium text-foreground">
      {{ $t('page.costLibrary.hint.batchSelected', [selectedIds.length]) }}
    </p>
    <p class="mb-4 text-sm text-muted-foreground">
      {{
        isSea
          ? $t('page.costLibrary.hint.batchCopyPromptSea')
          : $t('page.costLibrary.hint.batchCopyPrompt')
      }}
    </p>
    <Form class="cost-drawer-form px-1" />
    <div class="mt-6 flex flex-wrap justify-end gap-2">
      <Button :disabled="submitting" @click="modalApi.close()">
        {{ $t('common.cancel') }}
      </Button>
      <Button :loading="submitting" @click="submitCopy(false)">
        {{ $t('page.costLibrary.actions.batchCopySkip') }}
      </Button>
      <Button :loading="submitting" type="primary" @click="submitCopy(true)">
        {{ $t('page.costLibrary.actions.batchCopyApply') }}
      </Button>
    </div>
  </Modal>
</template>
