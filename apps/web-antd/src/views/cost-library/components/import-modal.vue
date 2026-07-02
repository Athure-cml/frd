<script lang="ts" setup>
import type { CostImportResult } from '#/api/cost';

import { ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';
import { ArrowUpToLine } from '@vben/icons';

import { Alert, Upload as AntUpload, Button, message } from 'ant-design-vue';

import { $t } from '#/locales';

const props = defineProps<{
  importFn: (file: File) => Promise<CostImportResult>;
  title: string;
}>();

const emit = defineEmits<{ success: [] }>();

const uploading = ref(false);
const fileList = ref<any[]>([]);
const importErrors = ref<string[]>([]);

const [Modal, modalApi] = useVbenModal({
  async onConfirm() {
    await handleConfirm();
  },
  onOpenChange(isOpen) {
    if (!isOpen) {
      fileList.value = [];
      importErrors.value = [];
    }
  },
});

async function handleConfirm() {
  const file = fileList.value[0]?.originFileObj as File | undefined;
  if (!file) {
    message.warning($t('page.costLibrary.hint.selectFile'));
    return;
  }
  uploading.value = true;
  importErrors.value = [];
  modalApi.lock();
  try {
    const result = await props.importFn(file);
    if (result.failed > 0) {
      importErrors.value = result.errors ?? [];
      message.warning(
        $t('page.costLibrary.hint.importPartial', [
          result.imported,
          result.failed,
        ]),
      );
      if (result.imported > 0) {
        emit('success');
      }
      return;
    }
    message.success(
      $t('page.costLibrary.hint.importSuccess', [result.imported]),
    );
    emit('success');
    modalApi.close();
    fileList.value = [];
  } finally {
    uploading.value = false;
    modalApi.unlock();
  }
}

function open() {
  modalApi.open();
}

defineExpose({ open });
</script>

<template>
  <Modal :title="title" class="w-full sm:w-[480px]">
    <p class="mb-3 text-sm text-muted-foreground">
      {{ $t('page.costLibrary.hint.importTemplate') }}
    </p>
    <AntUpload.Dragger
      v-model:file-list="fileList"
      :before-upload="() => false"
      :max-count="1"
      accept=".xlsx,.xls"
    >
      <p class="ant-upload-drag-icon flex justify-center">
        <ArrowUpToLine class="size-10 text-primary" />
      </p>
      <p class="ant-upload-text">
        {{ $t('page.costLibrary.hint.importDrop') }}
      </p>
      <p class="ant-upload-hint text-muted-foreground">
        {{ $t('page.costLibrary.hint.importFormat') }}
      </p>
    </AntUpload.Dragger>
    <Alert
      v-if="importErrors.length > 0"
      class="mt-3"
      show-icon
      type="warning"
      :message="$t('page.costLibrary.hint.importErrorTitle')"
    >
      <template #description>
        <ul class="cost-import-errors m-0 list-disc pl-4">
          <li v-for="(item, index) in importErrors" :key="index">
            {{ item }}
          </li>
        </ul>
      </template>
    </Alert>
    <template #footer>
      <Button @click="modalApi.close()">{{ $t('common.cancel') }}</Button>
      <Button :loading="uploading" type="primary" @click="handleConfirm">
        {{ $t('page.costLibrary.actions.import') }}
      </Button>
    </template>
  </Modal>
</template>
