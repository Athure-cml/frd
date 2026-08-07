<script lang="ts" setup>
import type { TableColumnsType, UploadChangeParam } from 'ant-design-vue';

import type { CostImportResult } from '#/api/cost';

import { computed, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';
import { ArrowUpToLine } from '@vben/icons';

import {
  Alert,
  Upload as AntUpload,
  Button,
  message,
  Table,
} from 'ant-design-vue';
import * as XLSX from 'xlsx';

import { $t } from '#/locales';

const props = withDefaults(
  defineProps<{
    /** 上传 accept，默认仅 xlsx；邮编可传 `.xlsx,.txt` */
    accept?: string;
    /** 覆盖默认格式说明文案 */
    formatHint?: string;
    importFn: (file: File) => Promise<CostImportResult>;
    /** 覆盖默认模板说明文案 */
    templateHint?: string;
    title: string;
  }>(),
  {
    accept: '.xlsx',
    formatHint: undefined,
    templateHint: undefined,
  },
);

const emit = defineEmits<{ success: [] }>();

const uploading = ref(false);
const parsing = ref(false);
const fileList = ref<any[]>([]);
const importErrors = ref<string[]>([]);
const previewColumns = ref<TableColumnsType>([]);
const previewRows = ref<Record<string, string>[]>([]);
const previewError = ref('');
const previewPage = ref({
  current: 1,
  pageSize: 20,
});

const selectedFileName = computed(
  () => fileList.value[0]?.name || fileList.value[0]?.originFileObj?.name || '',
);

const hasPreview = computed(
  () => previewColumns.value.length > 0 && !previewError.value,
);

const formatHintText = computed(
  () => props.formatHint || $t('page.costLibrary.hint.importFormat'),
);

const templateHintText = computed(
  () => props.templateHint || $t('page.costLibrary.hint.importTemplate'),
);

const previewPagination = computed(() => ({
  current: previewPage.value.current,
  pageSize: previewPage.value.pageSize,
  pageSizeOptions: ['10', '20', '50', '100'],
  showSizeChanger: true,
  showTotal: (total: number) =>
    $t('page.costLibrary.hint.importPreviewTotal', [total]),
  size: 'small' as const,
  total: previewRows.value.length,
}));

const [Modal, modalApi] = useVbenModal({
  async onConfirm() {
    await handleConfirm();
  },
  onOpenChange(isOpen) {
    if (!isOpen) {
      resetState();
    }
  },
});

function resetState() {
  fileList.value = [];
  importErrors.value = [];
  clearPreview();
}

function clearPreview() {
  previewColumns.value = [];
  previewRows.value = [];
  previewError.value = '';
  previewPage.value = { current: 1, pageSize: 20 };
}

function onPreviewTableChange(pagination: {
  current?: number;
  pageSize?: number;
}) {
  previewPage.value = {
    current: pagination.current ?? 1,
    pageSize: pagination.pageSize ?? previewPage.value.pageSize,
  };
}

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
    resetState();
  } finally {
    uploading.value = false;
    modalApi.unlock();
  }
}

async function onUploadChange(info: UploadChangeParam) {
  fileList.value = info.fileList.slice(-1);
  importErrors.value = [];
  const file = fileList.value[0]?.originFileObj as File | undefined;
  if (!file) {
    clearPreview();
    return;
  }
  await parsePreview(file);
}

async function parsePreview(file: File) {
  parsing.value = true;
  previewError.value = '';
  try {
    const lower = file.name.toLowerCase();
    if (lower.endsWith('.txt')) {
      await parseTextPreview(file);
      return;
    }
    await parseExcelPreview(file);
  } catch (error) {
    console.error(error);
    clearPreview();
    previewError.value = $t('page.costLibrary.hint.importPreviewFailed');
  } finally {
    parsing.value = false;
  }
}

async function parseTextPreview(file: File) {
  const text = await file.text();
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line) => line.trim() !== '');
  if (lines.length === 0) {
    clearPreview();
    previewError.value = $t('page.costLibrary.hint.importPreviewEmpty');
    return;
  }
  previewColumns.value = [
    {
      dataIndex: 'c0',
      ellipsis: true,
      key: 'c0',
      minWidth: 240,
      title: $t('page.costLibrary.hint.importPreviewLine'),
    },
  ];
  previewPage.value = {
    current: 1,
    pageSize: previewPage.value.pageSize || 20,
  };
  previewRows.value = lines.map((line, rowIndex) => ({
    c0: line,
    key: String(rowIndex),
  }));
}

async function parseExcelPreview(file: File) {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    clearPreview();
    previewError.value = $t('page.costLibrary.hint.importPreviewEmpty');
    return;
  }
  const sheet = workbook.Sheets[sheetName];
  const matrix = XLSX.utils.sheet_to_json<(boolean | null | number | string)[]>(
    sheet,
    {
      header: 1,
      defval: '',
      raw: false,
    },
  ) as (boolean | null | number | string)[][];

  const nonEmpty = matrix.filter((row) =>
    row.some((cell) => String(cell ?? '').trim() !== ''),
  );
  if (nonEmpty.length === 0) {
    clearPreview();
    previewError.value = $t('page.costLibrary.hint.importPreviewEmpty');
    return;
  }

  const headerRowCount = detectExcelHeaderRowCount(nonEmpty);
  const headerRows = nonEmpty.slice(0, headerRowCount);
  const dataMatrix = nonEmpty.slice(headerRowCount);
  if (dataMatrix.length === 0 && headerRows.length === 0) {
    clearPreview();
    previewError.value = $t('page.costLibrary.hint.importPreviewEmpty');
    return;
  }

  const colCount = Math.max(1, ...nonEmpty.map((row) => row.length));
  const headers = buildExcelPreviewHeaders(headerRows, colCount);

  previewColumns.value = headers.map((title, index) => ({
    dataIndex: `c${index}`,
    ellipsis: true,
    key: `c${index}`,
    minWidth: 96,
    title,
  }));

  previewPage.value = {
    current: 1,
    pageSize: previewPage.value.pageSize || 20,
  };
  previewRows.value = dataMatrix.map((row, rowIndex) => {
    const record: Record<string, string> = { key: String(rowIndex) };
    headers.forEach((_, colIndex) => {
      record[`c${colIndex}`] = String(row[colIndex] ?? '');
    });
    return record;
  });
}

function detectExcelHeaderRowCount(
  rows: (boolean | null | number | string)[][],
): number {
  if (rows.length === 0) {
    return 0;
  }
  if (rows.length === 1) {
    return 1;
  }
  const row0 = rows[0].map((cell) =>
    String(cell ?? '')
      .trim()
      .toUpperCase(),
  );
  const row1 = rows[1].map((cell) =>
    String(cell ?? '')
      .trim()
      .toUpperCase(),
  );
  const joined0 = row0.join(' ');
  if (
    joined0.includes('FM-OUTDOOR') ||
    joined0.includes('FM-INDOOR') ||
    joined0.includes('附加费')
  ) {
    return 2;
  }
  const subHeaderTokens = new Set([
    'BUC',
    'EBS',
    'GRI',
    'NON OAK',
    'OAK',
    'OTHERS',
    'VALIDITY',
    '有效期',
  ]);
  const headerLike = row1.filter((text) => subHeaderTokens.has(text)).length;
  return headerLike >= 2 ? 2 : 1;
}

function buildExcelPreviewHeaders(
  headerRows: (boolean | null | number | string)[][],
  colCount: number,
): string[] {
  if (headerRows.length === 0) {
    return Array.from({ length: colCount }, (_, index) =>
      $t('page.costLibrary.hint.importPreviewCol', [index + 1]),
    );
  }
  if (headerRows.length === 1) {
    return Array.from({ length: colCount }, (_, index) => {
      const label = String(headerRows[0]?.[index] ?? '').trim();
      return label || $t('page.costLibrary.hint.importPreviewCol', [index + 1]);
    });
  }

  const groups = Array.from({ length: colCount }, (_, index) =>
    String(headerRows[0]?.[index] ?? '').trim(),
  );
  let lastGroup = '';
  for (let i = 0; i < colCount; i += 1) {
    if (groups[i]) {
      lastGroup = groups[i];
    } else {
      groups[i] = lastGroup;
    }
  }

  return Array.from({ length: colCount }, (_, index) => {
    const group = groups[index] || '';
    const sub = String(headerRows[1]?.[index] ?? '').trim();
    if (sub && group && sub !== group) {
      return `${group} ${sub}`;
    }
    return (
      sub || group || $t('page.costLibrary.hint.importPreviewCol', [index + 1])
    );
  });
}

function clearFile(event?: Event) {
  event?.stopPropagation();
  event?.preventDefault();
  resetState();
}

function open() {
  modalApi.open();
}

defineExpose({ open });
</script>

<template>
  <Modal :title="title" class="import-preview-modal w-full sm:w-[760px]">
    <p class="mb-3 text-sm text-muted-foreground">
      {{ templateHintText }}
    </p>
    <AntUpload.Dragger
      v-model:file-list="fileList"
      :before-upload="() => false"
      :max-count="1"
      :show-upload-list="false"
      :accept="accept"
      class="import-upload-dragger"
      @change="onUploadChange"
    >
      <div v-if="!selectedFileName" class="px-2 py-4">
        <p class="ant-upload-drag-icon flex justify-center">
          <ArrowUpToLine class="size-10 text-primary" />
        </p>
        <p class="ant-upload-text">
          {{ $t('page.costLibrary.hint.importDrop') }}
        </p>
        <p class="ant-upload-hint text-muted-foreground">
          {{ formatHintText }}
        </p>
      </div>

      <div
        v-else
        class="import-preview-panel w-full px-1 text-left"
        @click.stop
      >
        <div class="mb-2 flex flex-wrap items-center justify-between gap-2">
          <div class="min-w-0">
            <div class="truncate text-sm font-medium text-foreground">
              {{ selectedFileName }}
            </div>
            <div class="text-xs text-muted-foreground">
              <template v-if="parsing">
                {{ $t('page.costLibrary.hint.importPreviewLoading') }}
              </template>
              <template v-else-if="hasPreview">
                {{
                  $t('page.costLibrary.hint.importPreviewMeta', [
                    previewRows.length,
                  ])
                }}
              </template>
              <template v-else-if="previewError">
                {{ previewError }}
              </template>
            </div>
          </div>
          <div class="flex shrink-0 gap-1">
            <Button size="small" type="link" @click.stop="clearFile">
              {{ $t('page.costLibrary.hint.importPreviewClear') }}
            </Button>
          </div>
        </div>

        <Table
          v-if="hasPreview"
          size="small"
          :columns="previewColumns"
          :data-source="previewRows"
          :pagination="previewPagination"
          :scroll="{ x: 'max-content', y: 260 }"
          bordered
          @change="onPreviewTableChange"
        />
        <div
          v-else-if="!parsing"
          class="rounded border border-dashed border-border px-3 py-8 text-center text-sm text-muted-foreground"
        >
          {{ previewError || $t('page.costLibrary.hint.importPreviewEmpty') }}
        </div>
      </div>
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

<style scoped>
.import-upload-dragger :deep(.ant-upload-drag) {
  padding: 12px;
}

.import-preview-panel :deep(.ant-table) {
  font-size: 12px;
}

.import-preview-panel :deep(.ant-table-thead > tr > th) {
  white-space: nowrap;
}
</style>
