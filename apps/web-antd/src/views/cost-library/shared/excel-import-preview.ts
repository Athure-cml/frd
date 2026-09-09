import type { WorkSheet } from 'xlsx';

import * as XLSX from 'xlsx';

/** 与 quote-api CostExcelSupport.detectHeaderRowCount 保持一致 */
export function detectExcelHeaderRowCount(
  matrix: (boolean | null | number | string)[][],
): number {
  const row0 = matrix[0];
  if (!row0 || row0.length === 0) {
    return 0;
  }

  const headerKeys = row0
    .map((cell) => normalizeHeaderKey(String(cell ?? '')))
    .filter(Boolean);
  const headerKeySet = new Set(headerKeys);
  if (
    headerKeySet.has(normalizeHeaderKey('FM-OUTDOOR')) ||
    headerKeySet.has(normalizeHeaderKey('FM-INDOOR')) ||
    headerKeySet.has(normalizeHeaderKey('附加费'))
  ) {
    return 2;
  }

  const row1 = matrix[1];
  if (!row1) {
    return 1;
  }

  let headerLike = 0;
  let englishRoadLike = 0;
  const colCount = Math.max(row0.length, row1.length);

  for (let i = 0; i < colCount; i += 1) {
    const text = String(row1[i] ?? '')
      .trim()
      .toUpperCase();
    if (!text) {
      continue;
    }
    if (
      text === 'NON OAK' ||
      text === 'OAK' ||
      text === 'VALIDITY' ||
      text === 'BUC' ||
      text === 'EBS' ||
      text === 'GRI' ||
      text === 'OTHERS' ||
      text === '有效期' ||
      text === '生效期' ||
      text === 'EFF' ||
      text === 'EFFECTIVE'
    ) {
      headerLike += 1;
    }
    if (
      text === 'ZIP CODE' ||
      text === 'CITY' ||
      text === 'STATE' ||
      text === 'POR' ||
      text === 'SUPPLIER' ||
      text === 'BASE' ||
      text === 'FSC' ||
      text === 'CHASSIS' ||
      text === 'OW' ||
      text === 'SPLIT' ||
      text.startsWith('STOP OFF') ||
      text === 'ALL IN' ||
      text.startsWith('ALL IN FM') ||
      text === 'WAITING' ||
      text === 'REDELIVERY' ||
      text === 'YARD STORAGE' ||
      text === 'EXTRA CHASSIS' ||
      text === 'PREPULL' ||
      text === 'LIFT' ||
      text === 'REMARK' ||
      text === 'EFFECTIVE TIME' ||
      text === 'VALID TIME' ||
      text.startsWith('PICK UP')
    ) {
      englishRoadLike += 1;
    }
  }

  if (englishRoadLike >= 4) {
    return 2;
  }
  return headerLike >= 2 ? 2 : 1;
}

/** 按工作表物理行列读取，保留空行/空列位置，避免 sheet_to_json 折叠导致少计一行 */
export function buildSheetMatrix(sheet: WorkSheet): string[][] {
  const ref = sheet['!ref'];
  if (!ref) {
    return [];
  }
  const range = XLSX.utils.decode_range(ref);
  const matrix: string[][] = [];
  for (let r = range.s.r; r <= range.e.r; r += 1) {
    const row: string[] = [];
    for (let c = range.s.c; c <= range.e.c; c += 1) {
      const addr = XLSX.utils.encode_cell({ r, c });
      const cell = sheet[addr];
      row.push(cell ? String(XLSX.utils.format_cell(cell) ?? '').trim() : '');
    }
    matrix.push(row);
  }
  return matrix;
}

export function rowHasContent(row: (boolean | null | number | string)[]) {
  return row.some((cell) => String(cell ?? '').trim() !== '');
}

export function extractPreviewDataMatrix(
  matrix: (boolean | null | number | string)[][],
  headerRowCount: number,
) {
  return matrix.slice(headerRowCount).filter((row) => rowHasContent(row));
}

function normalizeHeaderKey(value: string) {
  return value.replaceAll(/\s+/g, '').trim().toUpperCase();
}
