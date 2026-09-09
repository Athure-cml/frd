<script lang="ts" setup>
import type { CostMode, CostTableTemplate } from '#/api/cost';

import { computed, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import { Button, message } from 'ant-design-vue';

import { useVbenForm } from '#/adapter/form';
import { batchCopyRoadCost, seaCostApi } from '#/api/cost';
import { $t } from '#/locales';

import { useRoadBatchCopySchema } from '../road/form-schema';
import { ROAD_REMARK_FIELD } from '../shared/field-catalog/road';
import {
  joinContainerTypes,
  useSeaBatchCopySchema,
} from '../shared/freight-schema';
import BatchCopyPreviewModal from './batch-copy-preview-modal.vue';

const props = withDefaults(
  defineProps<{
    mode?: Extract<CostMode, 'road' | 'sea'>;
    template?: CostTableTemplate;
  }>(),
  { mode: 'road', template: undefined },
);

const emit = defineEmits<{ success: [] }>();

const selectedIds = ref<number[]>([]);
const submitting = ref(false);
const previewModalRef = ref<InstanceType<typeof BatchCopyPreviewModal>>();

const isSea = computed(() => props.mode === 'sea');

const [Form, formApi] = useVbenForm({
  layout: 'vertical',
  schema: isSea.value ? useSeaBatchCopySchema() : useRoadBatchCopySchema(),
  showDefaultActions: false,
  wrapperClass: isSea.value
    ? 'grid-cols-1 sm:grid-cols-2'
    : 'grid-cols-1 sm:grid-cols-2',
});

const [Modal, modalApi] = useVbenModal({
  class: isSea.value ? 'w-full sm:w-[720px]' : 'w-full sm:w-[860px]',
  footer: false,
  onOpenChange(isOpen) {
    if (!isOpen) {
      formApi.resetForm();
      selectedIds.value = [];
    }
  },
});

const ROAD_COPY_FIELDS = [
  'baseFreight',
  'fsc',
  'chassis',
  'triTandemAxle',
  'split',
  'stopOff',
  'waitingFee',
  'redelivery',
  'cf_road_yard_storage',
  'cf_road_extra_chassis',
  'prepull',
  'nsLift',
  'otherFee',
  'remark',
  ROAD_REMARK_FIELD,
  'cf_road_eff',
  'validDate',
] as const;

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

function optionalText(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function hasMeaningfulValue(value: unknown) {
  if (value === null || value === undefined || value === '') {
    return false;
  }
  if (typeof value === 'string') {
    return value.trim().length > 0;
  }
  return true;
}

function pickRoadCopyFields(values: Record<string, unknown>) {
  const fields: Record<string, unknown> = {};
  for (const key of ROAD_COPY_FIELDS) {
    const raw = values[key];
    if (!hasMeaningfulValue(raw)) {
      continue;
    }
    if (key === 'remark' || key === ROAD_REMARK_FIELD) {
      const text = optionalText(raw);
      if (text) {
        fields[key] = text;
      }
      continue;
    }
    if (key === 'cf_road_eff' || key === 'validDate') {
      const date = optionalDate(raw);
      if (date) {
        fields[key] = date;
      }
      continue;
    }
    const num = optionalNumber(raw);
    if (num !== undefined) {
      fields[key] = num;
    }
  }
  return fields;
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
    !!optionalDate(values.othersValidDate) ||
    optionalNumber(values.ebs) !== undefined ||
    !!optionalDate(values.ebsValidDate) ||
    optionalNumber(values.gri) !== undefined ||
    !!optionalDate(values.griValidDate) ||
    !!optionalText(values.remark)
  );
}

function buildRequest(
  applyOverrides: boolean,
  values: Record<string, unknown>,
) {
  if (isSea.value) {
    return {
      applyOverrides,
      buc: optionalNumber(values.buc),
      bucEffDate: optionalDate(values.bucEffDate),
      bucValidDate: optionalDate(values.bucValidDate),
      containerType: joinContainerTypes(
        values.containerType as string | string[],
      ),
      ebs: optionalNumber(values.ebs),
      ebsValidDate: optionalDate(values.ebsValidDate),
      freight: optionalNumber(values.freight),
      freightEffDate: optionalDate(values.freightEffDate),
      freightValidDate: optionalDate(values.freightValidDate),
      gri: optionalNumber(values.gri),
      griValidDate: optionalDate(values.griValidDate),
      ids: selectedIds.value,
      others: optionalNumber(values.others),
      othersEffDate: optionalDate(values.othersEffDate),
      othersValidDate: optionalDate(values.othersValidDate),
      previewOnly: true,
      remark: optionalText(values.remark),
    };
  }
  return {
    applyOverrides,
    fields: pickRoadCopyFields(values),
    ids: selectedIds.value,
    previewOnly: true,
  };
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
  } else if (applyOverrides) {
    const fields = pickRoadCopyFields(values);
    if (Object.keys(fields).length === 0) {
      message.warning($t('page.costLibrary.hint.batchCopyNeedFields'));
      return;
    }
  }

  submitting.value = true;
  modalApi.lock();
  try {
    const request = buildRequest(applyOverrides, values);
    const result = isSea.value
      ? await seaCostApi.batchCopy(request)
      : await batchCopyRoadCost(request);
    if (result.items.length === 0) {
      message.warning($t('page.costLibrary.hint.batchCopySuccess', [0]));
      return;
    }
    previewModalRef.value?.open({
      items: result.items,
      request: { ...request, previewOnly: false },
    });
  } finally {
    submitting.value = false;
    modalApi.unlock();
  }
}

function onPreviewSuccess() {
  previewModalRef.value?.close();
  modalApi.close();
  emit('success');
}

function onPreviewBack() {
  previewModalRef.value?.close();
}

function open(ids: number[]) {
  selectedIds.value = ids;
  modalApi.open();
}

defineExpose({ open });
</script>

<template>
  <Modal :title="$t('page.costLibrary.actions.batchCopy')">
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
  <BatchCopyPreviewModal
    ref="previewModalRef"
    :mode="mode"
    :template="template"
    @back="onPreviewBack"
    @success="onPreviewSuccess"
  />
</template>
