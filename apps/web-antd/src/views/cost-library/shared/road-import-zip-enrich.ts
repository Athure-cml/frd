import { resolveDestZips } from '#/api/master-data/us-state-zip';

/** 多个邮编时写入 ZIP 列（与后端 CostRoadZipPlaceholder.PENDING 一致） */
export const ROAD_ZIP_PENDING_PLACEHOLDER = '待补录';

/** 未找到 City+State 对应邮编时写入 ZIP 列（与后端 CostRoadZipPlaceholder.CITY_STATE_INVALID 一致） */
export const ROAD_ZIP_CITY_STATE_INVALID_PLACEHOLDER = 'CITY、STATE有误';

export type RoadZipEnrichIssue = {
  city: string;
  message: string;
  rowIndex: number;
  state: string;
};

export type RoadZipEnrichResult = {
  citiesNormalized: number;
  filled: number;
  issues: RoadZipEnrichIssue[];
  pending: number;
  pendingNotes: RoadZipEnrichIssue[];
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
 * 预览表：规范 City 大小写；缺 ZIP 且有 City+State 时批量解析邮编。
 */
export async function enrichRoadPreviewZipCodes(
  headers: string[],
  rows: Record<string, string>[],
): Promise<RoadZipEnrichResult> {
  const { cityIndex, stateIndex, zipIndex } =
    findRoadPreviewRouteColumns(headers);
  if (zipIndex < 0 || cityIndex < 0 || stateIndex < 0) {
    return {
      citiesNormalized: 0,
      filled: 0,
      issues: [],
      pending: 0,
      pendingNotes: [],
      rows,
    };
  }

  const zipKey = `c${zipIndex}`;
  const cityKey = `c${cityIndex}`;
  const stateKey = `c${stateIndex}`;

  const resolvePayload = rows.map((row) => ({
    city: String(row[cityKey] ?? '').trim(),
    state: String(row[stateKey] ?? '').trim(),
    zipCode: String(row[zipKey] ?? '').trim() || undefined,
  }));

  if (
    resolvePayload.every((item) => !item.city && !item.state && !item.zipCode)
  ) {
    return {
      citiesNormalized: 0,
      filled: 0,
      issues: [],
      pending: 0,
      pendingNotes: [],
      rows,
    };
  }

  const resolved = await resolveDestZips(resolvePayload);
  const nextRows = rows.map((row) => ({ ...row }));
  const issues: RoadZipEnrichIssue[] = [];
  const pendingNotes: RoadZipEnrichIssue[] = [];
  let filled = 0;
  let pending = 0;
  let citiesNormalized = 0;

  resolved.forEach((item, rowIndex) => {
    const row = nextRows[rowIndex];
    if (!item || !row) {
      return;
    }
    const city = String(row[cityKey] ?? '').trim();
    const state = String(row[stateKey] ?? '').trim();
    const zip = String(row[zipKey] ?? '').trim();

    if (item.canonicalCity && item.canonicalCity !== city) {
      row[cityKey] = item.canonicalCity;
      citiesNormalized += 1;
    }

    if (zip) {
      return;
    }
    if (!city || !state) {
      return;
    }

    if (item.status === 'unique' && item.zipCode) {
      row[zipKey] = item.zipCode;
      filled += 1;
      return;
    }
    if (item.status === 'ambiguous') {
      row[zipKey] = ROAD_ZIP_PENDING_PLACEHOLDER;
      pending += 1;
      const candidates =
        item.candidates && item.candidates.length > 0
          ? `（可选：${item.candidates.slice(0, 5).join(', ')}${item.candidates.length > 5 ? '…' : ''}）`
          : '';
      pendingNotes.push({
        city,
        message: `第 ${rowIndex + 1} 行：City+State 对应多个邮编，已填入「${ROAD_ZIP_PENDING_PLACEHOLDER}」${candidates}，请后续补录`,
        rowIndex,
        state,
      });
      return;
    }
    if (item.status === 'notFound') {
      row[zipKey] = ROAD_ZIP_CITY_STATE_INVALID_PLACEHOLDER;
      pending += 1;
      pendingNotes.push({
        city,
        message: `第 ${rowIndex + 1} 行：主数据中未找到 City+State 对应邮编，已填入「${ROAD_ZIP_CITY_STATE_INVALID_PLACEHOLDER}」，请核对 City/State 后补录`,
        rowIndex,
        state,
      });
    }
  });

  return {
    citiesNormalized,
    filled,
    issues,
    pending,
    pendingNotes,
    rows: nextRows,
  };
}
