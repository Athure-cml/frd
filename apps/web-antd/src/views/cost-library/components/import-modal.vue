<script lang="ts" setup>
import type { TableColumnsType, UploadChangeParam } from 'ant-design-vue';

import type { CostImportResult } from '#/api/cost';

import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue';

import { useVbenModal } from '@vben/common-ui';
import { ArrowUpToLine } from '@vben/icons';

import {
  Alert,
  Upload as AntUpload,
  Button,
  message,
  Pagination,
  Table,
} from 'ant-design-vue';
import * as XLSX from 'xlsx';
import XLSXStyle from 'xlsx-js-style';

import { $t } from '#/locales';

import { enrichRoadPreviewUnits } from '../shared/road-import-unit-enrich';
import { enrichRoadPreviewZipCodes } from '../shared/road-import-zip-enrich';

const props = withDefaults(
  defineProps<{
    /** 上传 accept，默认仅 xlsx；邮编可传 `.xlsx,.txt` */
    accept?: string;
    /**
     * 预览去重：按这些表头列组合唯一键（如 名称+类型+国家）。
     * 文件内重复保留首条；若提供 loadExistingDedupeKeys 则库中已有行也会剔除并提示。
     */
    dedupeKeyHeaders?: string[];
    /**
     * 卡车成本：解析预览后按 City+State 自动补全 ZIP（唯一匹配）。
     * 歧义/未匹配行会提示，确认导入时由后端整行报错。
     */
    enrichRoadZip?: boolean;
    /** 覆盖默认格式说明文案 */
    formatHint?: string;
    importFn: (
      file: File,
      options?: { dryRun?: boolean },
    ) => Promise<CostImportResult>;
    /** 返回已存在数据的去重键（与 dedupeKeyHeaders 同序拼接规则由调用方约定） */
    loadExistingDedupeKeys?: () => Promise<string[]>;
    /** 覆盖默认模板说明文案 */
    templateHint?: string;
    title: string;
  }>(),
  {
    accept: '.xlsx',
    dedupeKeyHeaders: undefined,
    enrichRoadZip: false,
    formatHint: undefined,
    loadExistingDedupeKeys: undefined,
    templateHint: undefined,
  },
);

const emit = defineEmits<{ success: [] }>();

const uploading = ref(false);
const validating = ref(false);
const parsing = ref(false);
const fileList = ref<any[]>([]);
const importErrors = ref<string[]>([]);
const validationOkHint = ref('');
const previewColumns = ref<TableColumnsType>([]);
const previewRows = ref<Record<string, string>[]>([]);
const previewError = ref('');
const previewPage = ref({
  current: 1,
  pageSize: 20,
});
const zipEnrichHint = ref('');
const zipEnrichIssues = ref<string[]>([]);
const zipEnrichPendingNotes = ref<string[]>([]);
/** 仅 notFound 等阻断性问题标红 */
const zipEnrichFailedIndexes = ref<number[]>([]);
const dedupeHint = ref('');
const dedupeIssues = ref<string[]>([]);
/** 导入失败的数据行号（1-based，与预览行对应） */
const importFailedRowNumbers = ref<number[]>([]);
/** 原始表头矩阵（1～2 行），用于按模板样式导出失败行 */
const previewHeaderMatrix = ref<string[][]>([]);
const tableHostRef = ref<HTMLElement | null>(null);
const tableScrollY = ref(260);
let tableResizeObserver: null | ResizeObserver = null;
/** 防止预览校验被旧文件结果覆盖 */
let validateToken = 0;

const selectedFileName = computed(
  () => fileList.value[0]?.name || fileList.value[0]?.originFileObj?.name || '',
);

const hasPreview = computed(
  () => previewColumns.value.length > 0 && !previewError.value,
);

const canConfirmImport = computed(
  () =>
    hasPreview.value &&
    !parsing.value &&
    !validating.value &&
    !uploading.value &&
    importErrors.value.length === 0 &&
    previewRows.value.length > 0,
);

const formatHintText = computed(
  () => props.formatHint || $t('page.costLibrary.hint.importFormat'),
);

const templateHintText = computed(
  () => props.templateHint || $t('page.costLibrary.hint.importTemplate'),
);

const previewPageRows = computed(() => {
  const { current, pageSize } = previewPage.value;
  const start = (current - 1) * pageSize;
  return previewRows.value.slice(start, start + pageSize);
});

/** 预览行下标 → 错误说明（仅问题行有值） */
const rowErrorMessages = computed(() => {
  const messagesByIndex = new Map<number, string[]>();

  const pushMessage = (index: number, msg: string) => {
    if (index < 0 || index >= previewRows.value.length) {
      return;
    }
    const text = msg.trim();
    if (!text) {
      return;
    }
    const list = messagesByIndex.get(index) ?? [];
    if (!list.includes(text)) {
      list.push(text);
    }
    messagesByIndex.set(index, list);
  };

  for (const error of importErrors.value) {
    const match = String(error).match(/第\s*(\d+)\s*行[:：]?\s*(.*)$/);
    if (!match?.[1]) {
      continue;
    }
    const rowNo = Number(match[1]);
    if (!Number.isFinite(rowNo) || rowNo <= 0) {
      continue;
    }
    pushMessage(rowNo - 1, match[2] || String(error));
  }

  for (const rowNo of importFailedRowNumbers.value) {
    const index = rowNo - 1;
    if (!messagesByIndex.has(index)) {
      pushMessage(index, $t('page.costLibrary.hint.importErrorFallback'));
    }
  }

  zipEnrichFailedIndexes.value.forEach((index, issueIndex) => {
    const issue = zipEnrichIssues.value[issueIndex];
    pushMessage(
      index,
      issue || $t('page.costLibrary.hint.importErrorFallback'),
    );
  });

  const result: Record<number, string> = {};
  for (const [index, messages] of messagesByIndex) {
    result[index] = messages.join('；');
  }
  return result;
});

const failedRowCount = computed(
  () => Object.keys(rowErrorMessages.value).length,
);

const hasDownloadableFailedRows = computed(
  () =>
    failedRowCount.value > 0 &&
    previewRows.value.length > 0 &&
    previewColumns.value.length > 0,
);

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

const isFullscreen = modalApi.useStore((state) => state.fullscreen);

/** 未全屏保持原宽度；仅全屏时铺满并自适应表格高度 */
const modalClass = computed(() =>
  [
    'import-preview-modal',
    'w-full sm:w-[760px]',
    hasPreview.value ? 'import-preview-modal--preview' : '',
    isFullscreen.value ? 'import-preview-modal--fullscreen' : '',
  ]
    .filter(Boolean)
    .join(' '),
);

const tableScroll = computed(() => {
  const scroll: { x: 'max-content'; y?: number } = { x: 'max-content' };
  // 少量数据时不设 scroll.y，避免表头与首行重叠
  if (isFullscreen.value || previewRows.value.length > 10) {
    scroll.y = tableScrollY.value;
  }
  return scroll;
});

function measureTableScrollY() {
  // 普通窗口：固定可视高度，分页在表格外单独渲染
  if (!isFullscreen.value) {
    tableScrollY.value = 260;
    return;
  }
  const host = tableHostRef.value;
  if (!host) {
    return;
  }
  // 全屏：scroll.y 只控制表体；表头约占 39px，需从 host 中扣除
  tableScrollY.value = Math.max(200, host.clientHeight - 39);
}

function bindTableHost() {
  tableResizeObserver?.disconnect();
  tableResizeObserver = null;
  const host = tableHostRef.value;
  if (!host) {
    measureTableScrollY();
    return;
  }
  if (typeof ResizeObserver !== 'undefined') {
    tableResizeObserver = new ResizeObserver(() => measureTableScrollY());
    tableResizeObserver.observe(host);
  }
  measureTableScrollY();
}

watch(
  [hasPreview, isFullscreen, zipEnrichHint, dedupeHint],
  async ([preview]) => {
    if (!preview) {
      tableResizeObserver?.disconnect();
      tableResizeObserver = null;
      tableScrollY.value = 260;
      return;
    }
    await nextTick();
    bindTableHost();
  },
);

onBeforeUnmount(() => {
  tableResizeObserver?.disconnect();
  tableResizeObserver = null;
});

function resetState() {
  fileList.value = [];
  importErrors.value = [];
  validationOkHint.value = '';
  validateToken += 1;
  clearPreview();
}

function clearPreview() {
  previewColumns.value = [];
  previewRows.value = [];
  previewError.value = '';
  previewPage.value = { current: 1, pageSize: 20 };
  zipEnrichHint.value = '';
  zipEnrichIssues.value = [];
  zipEnrichPendingNotes.value = [];
  zipEnrichFailedIndexes.value = [];
  dedupeHint.value = '';
  dedupeIssues.value = [];
  importFailedRowNumbers.value = [];
  previewHeaderMatrix.value = [];
  validationOkHint.value = '';
}

function onPreviewPageChange(page: number, pageSize: number) {
  previewPage.value = {
    current: page,
    pageSize,
  };
  void nextTick(() => measureTableScrollY());
}

function isTextImportFile(file: File) {
  return file.name.toLowerCase().endsWith('.txt');
}

/** txt 保留原文件（Tab 分隔）；Excel 可按预览重建 */
function resolveUploadFile(file: File) {
  if (isTextImportFile(file)) {
    return file;
  }
  return hasPreview.value ? buildFileFromPreview(file.name) : file;
}

async function handleConfirm() {
  if (!canConfirmImport.value) {
    if (importErrors.value.length > 0) {
      message.warning($t('page.costLibrary.hint.importBlockedNeedFix'));
    }
    return;
  }
  const file = fileList.value[0]?.originFileObj as File | undefined;
  if (!file) {
    message.warning($t('page.costLibrary.hint.selectFile'));
    return;
  }
  uploading.value = true;
  importErrors.value = [];
  importFailedRowNumbers.value = [];
  validationOkHint.value = '';
  modalApi.lock();
  try {
    const uploadFile = resolveUploadFile(file);
    const result = await props.importFn(uploadFile);
    if (result.failed > 0) {
      importErrors.value = result.errors ?? [];
      importFailedRowNumbers.value = resolveFailedRowNumbers(result);
      message.warning(
        $t('page.costLibrary.hint.importBlocked', [result.failed]),
      );
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

async function runPreValidate() {
  if (!hasPreview.value || previewRows.value.length === 0) {
    return;
  }
  const file = fileList.value[0]?.originFileObj as File | undefined;
  if (!file) {
    return;
  }
  const token = ++validateToken;
  validating.value = true;
  importErrors.value = [];
  importFailedRowNumbers.value = [];
  validationOkHint.value = '';
  try {
    const uploadFile = resolveUploadFile(file);
    const result = await props.importFn(uploadFile, { dryRun: true });
    if (token !== validateToken) {
      return;
    }
    if (result.failed > 0) {
      importErrors.value = result.errors ?? [];
      importFailedRowNumbers.value = resolveFailedRowNumbers(result);
      validationOkHint.value = '';
      return;
    }
    validationOkHint.value = $t('page.costLibrary.hint.importValidateOk', [
      result.imported,
    ]);
  } catch (error) {
    if (token !== validateToken) {
      return;
    }
    console.error(error);
    importErrors.value = [$t('page.costLibrary.hint.importValidateFailed')];
  } finally {
    if (token === validateToken) {
      validating.value = false;
    }
  }
}

/** 按当前预览表重建 xlsx，确保确认导入与去重后预览一致 */
function buildFileFromPreview(originalName: string) {
  return buildWorkbookFile(previewRows.value, originalName);
}

function buildWorkbookFile(
  rows: Record<string, string>[],
  originalName: string,
  suffix = '',
) {
  const colCount = Math.max(
    1,
    previewColumns.value.length,
    ...previewHeaderMatrix.value.map((row) => row.length),
  );
  const headerMatrix =
    previewHeaderMatrix.value.length > 0
      ? previewHeaderMatrix.value.map((row) =>
          Array.from({ length: colCount }, (_, index) =>
            String(row[index] ?? ''),
          ),
        )
      : [previewColumns.value.map((col) => String(col.title ?? ''))];
  const aoa: string[][] = [
    ...headerMatrix,
    ...rows.map((row) =>
      Array.from({ length: colCount }, (_, index) =>
        String(row[`c${index}`] ?? ''),
      ),
    ),
  ];
  const sheet = XLSX.utils.aoa_to_sheet(aoa);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, 'Sheet1');
  const buffer = XLSX.write(workbook, {
    bookType: 'xlsx',
    type: 'array',
  }) as ArrayBuffer;
  const baseName = originalName.replace(/\.[^.]+$/, '') || 'import';
  return new File([buffer], `${baseName}${suffix}.xlsx`, {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

function resolveFailedRowNumbers(result: CostImportResult): number[] {
  const fromApi = (result.failedRowNumbers ?? [])
    .map(Number)
    .filter((n) => Number.isFinite(n) && n > 0);
  if (fromApi.length > 0) {
    return [...new Set(fromApi)].toSorted((a, b) => a - b);
  }
  const parsed: number[] = [];
  for (const error of result.errors ?? []) {
    const match = String(error).match(/第\s*(\d+)\s*行/);
    if (match?.[1]) {
      parsed.push(Number(match[1]));
    }
  }
  return [...new Set(parsed)].toSorted((a, b) => a - b);
}

function downloadFailedRows() {
  if (!hasDownloadableFailedRows.value) {
    message.warning($t('page.costLibrary.hint.importFailedDownloadEmpty'));
    return;
  }
  const originalName = selectedFileName.value || 'import.xlsx';
  const file = buildAnnotatedWorkbookFile(originalName);
  const url = URL.createObjectURL(file);
  const link = document.createElement('a');
  link.href = url;
  link.download = file.name;
  link.click();
  URL.revokeObjectURL(url);
  message.success(
    $t('page.costLibrary.hint.importFailedDownloadSuccess', [
      previewRows.value.length,
      failedRowCount.value,
    ]),
  );
}

/**
 * 导出全部预览数据：追加「校验问题」列；
 * 仅问题行写错误文案并浅红底，便于改完删列后一次整表导入。
 */
function buildAnnotatedWorkbookFile(originalName: string) {
  const XLSXS = XLSXStyle;
  const colCount = Math.max(
    1,
    previewColumns.value.length,
    ...previewHeaderMatrix.value.map((row) => row.length),
  );
  const errorTitle = $t('page.costLibrary.hint.importErrorColumn');
  const errorByIndex = rowErrorMessages.value;
  const headerMatrix =
    previewHeaderMatrix.value.length > 0
      ? previewHeaderMatrix.value.map((row, rowIndex) => {
          const cells = Array.from({ length: colCount }, (_, index) =>
            String(row[index] ?? ''),
          );
          cells.push(
            rowIndex === previewHeaderMatrix.value.length - 1 ? errorTitle : '',
          );
          return cells;
        })
      : [
          [
            ...previewColumns.value.map((col) => String(col.title ?? '')),
            errorTitle,
          ],
        ];

  const dataRows = previewRows.value.map((row, index) => [
    ...Array.from({ length: colCount }, (_, colIndex) =>
      String(row[`c${colIndex}`] ?? ''),
    ),
    errorByIndex[index] ?? '',
  ]);

  const aoa: string[][] = [...headerMatrix, ...dataRows];
  const sheet = XLSXS.utils.aoa_to_sheet(aoa);
  const totalCols = colCount + 1;
  const headerRowCount = headerMatrix.length;
  const lightRed = {
    fill: {
      fgColor: { rgb: 'FDECEC' },
      patternType: 'solid',
    },
  };

  for (let r = headerRowCount; r < aoa.length; r += 1) {
    const previewIndex = r - headerRowCount;
    if (!errorByIndex[previewIndex]) {
      continue;
    }
    for (let c = 0; c < totalCols; c += 1) {
      const addr = XLSXS.utils.encode_cell({ c, r });
      const cell = sheet[addr] ?? { t: 's', v: '' };
      cell.s = {
        ...cell.s,
        ...lightRed,
      };
      sheet[addr] = cell;
    }
  }

  const errorTexts = Object.values(errorByIndex);
  const errorColWidth = Math.min(
    60,
    Math.max(
      24,
      ...(errorTexts.length > 0
        ? errorTexts.map((text) => Math.ceil(text.length / 2))
        : [24]),
    ),
  );
  sheet['!cols'] = Array.from({ length: totalCols }, (_, index) =>
    index === totalCols - 1 ? { wch: errorColWidth } : { wch: 14 },
  );

  const workbook = XLSXS.utils.book_new();
  XLSXS.utils.book_append_sheet(workbook, sheet, 'Sheet1');
  const buffer = XLSXS.write(workbook, {
    bookType: 'xlsx',
    type: 'array',
  }) as ArrayBuffer;
  const baseName = originalName.replace(/\.[^.]+$/, '') || 'import';
  return new File([buffer], `${baseName}-annotated.xlsx`, {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

async function onUploadChange(info: UploadChangeParam) {
  fileList.value = info.fileList.slice(-1);
  importErrors.value = [];
  validationOkHint.value = '';
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
  await runPreValidate();
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
  previewHeaderMatrix.value = headerRows.map((row) =>
    Array.from({ length: colCount }, (_, index) =>
      String(row[index] ?? '').trim(),
    ),
  );

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

  if (props.dedupeKeyHeaders?.length) {
    await applyPreviewDedupe(headers);
  }

  if (props.enrichRoadZip) {
    await applyRoadZipEnrichment(headers);
  }

  await runPreValidate();
}

async function applyPreviewDedupe(headers: string[]) {
  dedupeHint.value = '';
  dedupeIssues.value = [];
  const keyHeaders = props.dedupeKeyHeaders ?? [];
  if (keyHeaders.length === 0) {
    return;
  }

  const colIndexes = keyHeaders.map((header) =>
    headers.findIndex(
      (item) => normalizeHeaderLabel(item) === normalizeHeaderLabel(header),
    ),
  );
  if (colIndexes.some((index) => index < 0)) {
    return;
  }

  let existingKeys = new Set<string>();
  if (props.loadExistingDedupeKeys) {
    try {
      const keys = await props.loadExistingDedupeKeys();
      existingKeys = new Set(keys.map((key) => key.trim()).filter(Boolean));
    } catch (error) {
      console.error(error);
    }
  }

  const seenInFile = new Set<string>();
  const kept: Record<string, string>[] = [];
  const issues: string[] = [];
  let removedExisting = 0;
  let removedFileDup = 0;

  previewRows.value.forEach((row, index) => {
    const excelRowNo = index + 2; // 含表头，按 Excel 习惯从 2 起
    const parts = colIndexes.map((colIndex, partIndex) => {
      const raw = String(row[`c${colIndex}`] ?? '');
      const header = keyHeaders[partIndex] ?? '';
      if (normalizeHeaderLabel(header) === normalizeHeaderLabel('类型')) {
        return normalizePortTypeForDedupe(raw);
      }
      return normalizeDedupeCell(raw);
    });
    if (parts.every((part) => !part)) {
      kept.push(row);
      return;
    }
    const key = parts.join('\u0001');
    const label = keyHeaders
      .map((header, i) => {
        const colIndex = colIndexes[i];
        return `${header}=${String(row[`c${colIndex ?? ''}`] ?? '').trim()}`;
      })
      .join('，');

    if (existingKeys.has(key)) {
      removedExisting += 1;
      issues.push(
        $t('page.costLibrary.hint.importDedupeExistingRow', [
          excelRowNo,
          label,
        ]),
      );
      return;
    }
    if (seenInFile.has(key)) {
      removedFileDup += 1;
      issues.push(
        $t('page.costLibrary.hint.importDedupeFileDupRow', [excelRowNo, label]),
      );
      return;
    }
    seenInFile.add(key);
    kept.push({ ...row, key: String(kept.length) });
  });

  previewRows.value = kept;
  dedupeIssues.value = issues;
  const removed = removedExisting + removedFileDup;
  if (removed > 0) {
    dedupeHint.value = $t('page.costLibrary.hint.importDedupeSummary', [
      removed,
      removedExisting,
      removedFileDup,
    ]);
  }
}

function normalizeHeaderLabel(value: string) {
  return value.replaceAll(/\s+/g, '').trim().toUpperCase();
}

function normalizeDedupeCell(value: string) {
  return value
    .replaceAll(/[\u200B-\u200D\uFEFF]/g, '')
    .trim()
    .toUpperCase();
}

function normalizePortTypeForDedupe(raw: string) {
  const text = raw.replaceAll(/[\u200B-\u200D\uFEFF]/g, '').trim();
  if (!text) {
    return '';
  }
  const upper = text.toUpperCase();
  if (
    text === '港口' ||
    text === '海港' ||
    upper === 'SEAPORT' ||
    upper === 'PORT'
  ) {
    return 'SEAPORT';
  }
  if (text === '内陆点' || text === '内陆' || upper === 'INLAND') {
    return 'INLAND';
  }
  if (text === '铁路场站' || text === '铁路' || upper === 'RAIL') {
    return 'RAIL';
  }
  if (text === '机场' || upper === 'AIRPORT') {
    return 'AIRPORT';
  }
  if (text === '其他' || upper === 'OTHER') {
    return 'OTHER';
  }
  return upper;
}

async function applyRoadZipEnrichment(headers: string[]) {
  zipEnrichHint.value = '';
  zipEnrichIssues.value = [];
  zipEnrichPendingNotes.value = [];
  zipEnrichFailedIndexes.value = [];
  try {
    const result = await enrichRoadPreviewZipCodes(headers, previewRows.value);
    previewRows.value = result.rows;
    zipEnrichIssues.value = result.issues.map((item) => item.message);
    zipEnrichPendingNotes.value = result.pendingNotes.map(
      (item) => item.message,
    );
    zipEnrichFailedIndexes.value = result.issues.map((item) => item.rowIndex);
    if (result.filled > 0 && result.pending > 0 && result.issues.length > 0) {
      zipEnrichHint.value = $t('page.costLibrary.hint.importZipEnrichMixed', [
        result.filled,
        result.pending,
        result.issues.length,
      ]);
    } else if (result.filled > 0 && result.pending > 0) {
      zipEnrichHint.value = $t('page.costLibrary.hint.importZipEnrichPartial', [
        result.filled,
        result.pending,
      ]);
    } else if (result.filled > 0) {
      zipEnrichHint.value = $t('page.costLibrary.hint.importZipEnrichFilled', [
        result.filled,
      ]);
    } else if (result.pending > 0 && result.issues.length > 0) {
      zipEnrichHint.value = $t(
        'page.costLibrary.hint.importZipEnrichPendingWithIssues',
        [result.pending, result.issues.length],
      );
    } else if (result.pending > 0) {
      zipEnrichHint.value = $t('page.costLibrary.hint.importZipEnrichPending', [
        result.pending,
      ]);
    } else if (result.issues.length > 0) {
      zipEnrichHint.value = $t('page.costLibrary.hint.importZipEnrichIssues', [
        result.issues.length,
      ]);
    }
    if (result.citiesNormalized > 0) {
      const cityHint = $t('page.costLibrary.hint.importCityNormalized', [
        result.citiesNormalized,
      ]);
      zipEnrichHint.value = zipEnrichHint.value
        ? `${zipEnrichHint.value}；${cityHint}`
        : cityHint;
    }
    const unitResult = await enrichRoadPreviewUnits(headers, previewRows.value);
    previewRows.value = unitResult.rows;
    if (unitResult.normalized > 0) {
      const unitHint = $t('page.costLibrary.hint.importUnitNormalized', [
        unitResult.normalized,
      ]);
      zipEnrichHint.value = zipEnrichHint.value
        ? `${zipEnrichHint.value}；${unitHint}`
        : unitHint;
    }
  } catch (error) {
    console.error(error);
    zipEnrichHint.value = $t('page.costLibrary.hint.importZipEnrichFailed');
  }
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
  <Modal
    :title="title"
    :class="modalClass"
    :content-class="
      hasPreview && isFullscreen
        ? 'import-preview-modal__body import-preview-modal__body--preview'
        : 'import-preview-modal__body'
    "
  >
    <div
      class="import-preview-root"
      :class="{
        'import-preview-root--preview': !!selectedFileName,
        'import-preview-root--fill': hasPreview && isFullscreen,
      }"
    >
      <p class="mb-3 shrink-0 text-sm text-muted-foreground">
        {{ templateHintText }}
      </p>

      <!-- 未选文件：仅展示上传虚线框 -->
      <AntUpload.Dragger
        v-if="!selectedFileName"
        v-model:file-list="fileList"
        :before-upload="() => false"
        :max-count="1"
        :show-upload-list="false"
        :accept="accept"
        class="import-upload-dragger"
        @change="onUploadChange"
      >
        <div class="px-2 py-4">
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
      </AntUpload.Dragger>

      <!-- 已选文件：预览移出虚线框，避免宽表撑破内框 -->
      <div v-else class="import-preview-layout">
        <div class="import-preview-filebar">
          <div class="min-w-0 flex-1">
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
          <Button class="shrink-0" size="small" type="link" @click="clearFile">
            {{ $t('page.costLibrary.hint.importPreviewClear') }}
          </Button>
        </div>

        <template v-if="hasPreview">
          <div ref="tableHostRef" class="import-preview-table-host">
            <Table
              row-key="key"
              size="small"
              :columns="previewColumns"
              :data-source="previewPageRows"
              :pagination="false"
              :scroll="tableScroll"
              :sticky="{ offsetHeader: 0 }"
              bordered
            />
          </div>
          <div class="import-preview-pager shrink-0">
            <Pagination
              size="small"
              :current="previewPage.current"
              :page-size="previewPage.pageSize"
              :page-size-options="['10', '20', '50', '100']"
              :show-size-changer="true"
              :show-total="
                (total) =>
                  $t('page.costLibrary.hint.importPreviewTotal', [total])
              "
              :total="previewRows.length"
              @change="onPreviewPageChange"
              @show-size-change="onPreviewPageChange"
            />
          </div>
          <Alert
            v-if="dedupeHint"
            class="import-preview-alert shrink-0"
            show-icon
            type="warning"
            :message="dedupeHint"
          >
            <template v-if="dedupeIssues.length > 0" #description>
              <ul class="mb-0 max-h-28 list-disc overflow-auto pl-4 text-xs">
                <li v-for="(err, idx) in dedupeIssues" :key="idx">
                  {{ err }}
                </li>
              </ul>
            </template>
          </Alert>
          <Alert
            v-if="zipEnrichHint"
            class="import-preview-alert shrink-0"
            show-icon
            :type="zipEnrichIssues.length > 0 ? 'warning' : 'info'"
            :message="zipEnrichHint"
          >
            <template
              v-if="
                zipEnrichPendingNotes.length > 0 || zipEnrichIssues.length > 0
              "
              #description
            >
              <ul
                v-if="zipEnrichPendingNotes.length > 0"
                class="mb-0 max-h-28 list-disc overflow-auto pl-4 text-xs"
              >
                <li
                  v-for="(note, idx) in zipEnrichPendingNotes"
                  :key="`p-${idx}`"
                >
                  {{ note }}
                </li>
              </ul>
              <ul
                v-if="zipEnrichIssues.length > 0"
                class="mb-0 max-h-28 list-disc overflow-auto pl-4 text-xs"
                :class="{ 'mt-2': zipEnrichPendingNotes.length > 0 }"
              >
                <li v-for="(err, idx) in zipEnrichIssues" :key="`e-${idx}`">
                  {{ err }}
                </li>
              </ul>
              <Button
                v-if="hasDownloadableFailedRows"
                class="mt-2"
                size="small"
                type="link"
                @click="downloadFailedRows"
              >
                {{ $t('page.costLibrary.hint.importFailedDownload') }}
              </Button>
            </template>
          </Alert>
          <Alert
            v-if="validating"
            class="import-preview-alert shrink-0"
            show-icon
            type="info"
            :message="$t('page.costLibrary.hint.importValidating')"
          />
          <Alert
            v-else-if="validationOkHint"
            class="import-preview-alert shrink-0"
            show-icon
            type="success"
            :message="validationOkHint"
          />
        </template>
        <div
          v-else-if="!parsing"
          class="rounded border border-dashed border-border px-3 py-8 text-center text-sm text-muted-foreground"
        >
          {{ previewError || $t('page.costLibrary.hint.importPreviewEmpty') }}
        </div>
      </div>

      <Alert
        v-if="importErrors.length > 0"
        class="mt-3 shrink-0"
        show-icon
        type="error"
        :message="$t('page.costLibrary.hint.importErrorTitle')"
      >
        <template #description>
          <p class="mb-2 text-xs">
            {{ $t('page.costLibrary.hint.importBlockedHint') }}
          </p>
          <ul class="cost-import-errors m-0 list-disc pl-4">
            <li v-for="(item, index) in importErrors" :key="index">
              {{ item }}
            </li>
          </ul>
          <Button
            v-if="hasDownloadableFailedRows"
            class="mt-2"
            size="small"
            type="link"
            @click="downloadFailedRows"
          >
            {{ $t('page.costLibrary.hint.importFailedDownload') }}
          </Button>
        </template>
      </Alert>
    </div>

    <template #footer>
      <Button @click="modalApi.close()">{{ $t('common.cancel') }}</Button>
      <Button
        :disabled="!canConfirmImport"
        :loading="uploading || validating"
        type="primary"
        @click="handleConfirm"
      >
        {{ $t('page.costLibrary.actions.import') }}
      </Button>
    </template>
  </Modal>
</template>

<style scoped>
.import-preview-root--preview {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.import-preview-root--fill {
  height: 100%;
  min-height: 0;
}

.import-preview-layout {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
}

.import-preview-filebar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  justify-content: space-between;
  padding: 8px 10px;
  margin-bottom: 8px;
  background: hsl(var(--accent) / 40%);
  border: 1px solid hsl(var(--border));
  border-radius: 8px;
}

.import-preview-table-host {
  flex: 1 1 auto;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
}

.import-preview-table-host :deep(.ant-table) {
  font-size: 12px;
}

.import-preview-table-host :deep(.ant-table-thead > tr > th) {
  z-index: 2;
  white-space: nowrap;
  background: hsl(var(--background));
}

.import-preview-table-host :deep(.ant-table-header) {
  position: relative;
  z-index: 2;
}

.import-preview-table-host :deep(.ant-table-body) {
  position: relative;
  z-index: 1;
}

.import-preview-table-host :deep(.ant-table-container) {
  max-width: 100%;
}

.import-preview-pager {
  display: flex;
  justify-content: flex-end;
  padding-top: 8px;
}

.import-preview-alert {
  max-width: 100%;
  margin-top: 8px;
}

.import-preview-alert :deep(.ant-alert-message) {
  overflow-wrap: anywhere;
}

.import-upload-dragger :deep(.ant-upload-drag) {
  padding: 12px;
}
</style>

<!-- Modal 根节点在子组件上，需非 scoped 才能作用到 DialogContent / content 区 -->
<style>
/* 仅全屏时拉满；普通窗口保持默认弹窗尺寸，不因预览自动加宽/加高 */
.import-preview-modal.import-preview-modal--fullscreen {
  width: 100% !important;
  max-width: 100% !important;
  height: 100% !important;
  max-height: 100% !important;
}

.import-preview-modal--fullscreen .import-preview-modal__body--preview {
  display: flex !important;
  flex: 1 1 auto;
  flex-direction: column;
  min-height: 0;
  overflow: hidden !important;
}

.import-preview-modal--fullscreen
  .import-preview-modal__body--preview
  > .import-preview-root {
  flex: 1 1 auto;
  min-height: 0;
}
</style>
