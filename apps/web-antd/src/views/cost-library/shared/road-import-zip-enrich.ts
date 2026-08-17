import { resolveDestZips } from '#/api/master-data/us-state-zip';

export type RoadZipEnrichIssue = {
  city: string;
  message: string;
  rowIndex: number;
  state: string;
};

export type RoadZipEnrichResult = {
  filled: number;
  issues: RoadZipEnrichIssue[];
  rows: Record<string, string>[];
};

function normalizeHeader(title: string) {
  return title.trim().toUpperCase().replaceAll('*', '').replaceAll(/\s+/g, ' ');
}

function findColumnIndex(
  headers: string[],
  matchers: Array<(normalized: string) => boolean>,
) {
  for (const [index, title] of headers.entries()) {
    const normalized = normalizeHeader(title);
    if (matchers.some((match) => match(normalized))) {
      return index;
    }
  }
  return -1;
}

export function findRoadPreviewRouteColumns(headers: string[]) {
  const zipIndex = findColumnIndex(headers, [
    (h) => h === '邮编' || h === '*邮编',
    (h) => h === 'ZIP CODE' || h === 'ZIPCODE' || h === 'ZIP',
    (h) => h.includes('ZIP') && h.includes('CODE'),
    (h) => h.includes('邮编'),
  ]);
  const cityIndex = findColumnIndex(headers, [
    (h) => h === '城市' || h === '*城市' || h === 'CITY',
    (h) => h.endsWith(' CITY') || h.startsWith('CITY '),
    (h) => h.includes('城市'),
  ]);
  const stateIndex = findColumnIndex(headers, [
    (h) => h === '州' || h === '*州' || h === 'STATE',
    (h) => h.endsWith(' STATE') || h.startsWith('STATE '),
    (h) => h === '州' || h.includes('州'),
  ]);
  return { cityIndex, stateIndex, zipIndex };
}

/**
 * 预览表：缺 ZIP 且有 City+State 时批量解析；唯一匹配写入 ZIP 列。
 * 歧义/未找到仅记录 issues，确认导入时由后端整行报错。
 */
export async function enrichRoadPreviewZipCodes(
  headers: string[],
  rows: Record<string, string>[],
): Promise<RoadZipEnrichResult> {
  const { cityIndex, stateIndex, zipIndex } =
    findRoadPreviewRouteColumns(headers);
  if (zipIndex < 0 || cityIndex < 0 || stateIndex < 0) {
    return { filled: 0, issues: [], rows };
  }

  const zipKey = `c${zipIndex}`;
  const cityKey = `c${cityIndex}`;
  const stateKey = `c${stateIndex}`;

  const needResolveIndexes: number[] = [];
  const resolvePayload: Array<{ city: string; state: string }> = [];

  rows.forEach((row, rowIndex) => {
    const zip = String(row[zipKey] ?? '').trim();
    const city = String(row[cityKey] ?? '').trim();
    const state = String(row[stateKey] ?? '').trim();
    if (zip || !city || !state) {
      return;
    }
    needResolveIndexes.push(rowIndex);
    resolvePayload.push({ city, state });
  });

  if (resolvePayload.length === 0) {
    return { filled: 0, issues: [], rows };
  }

  const resolved = await resolveDestZips(resolvePayload);
  const nextRows = rows.map((row) => ({ ...row }));
  const issues: RoadZipEnrichIssue[] = [];
  let filled = 0;

  needResolveIndexes.forEach((rowIndex, payloadIndex) => {
    const item = resolved[payloadIndex];
    const row = nextRows[rowIndex];
    if (!item || !row) {
      return;
    }
    const city = String(row[cityKey] ?? '').trim();
    const state = String(row[stateKey] ?? '').trim();
    if (item.status === 'unique' && item.zipCode) {
      row[zipKey] = item.zipCode;
      filled += 1;
      return;
    }
    if (item.status === 'ambiguous') {
      const candidates =
        item.candidates && item.candidates.length > 0
          ? `（${item.candidates.join(', ')}）`
          : '';
      issues.push({
        city,
        message: `第 ${rowIndex + 1} 行：City+State 对应多个邮编${candidates}，请填写邮编`,
        rowIndex,
        state,
      });
      return;
    }
    if (item.status === 'notFound') {
      issues.push({
        city,
        message: `第 ${rowIndex + 1} 行：主数据中未找到 City+State 对应邮编，请填写邮编`,
        rowIndex,
        state,
      });
    }
  });

  return { filled, issues, rows: nextRows };
}
