import type { UnitApi } from '#/api/unit';

import { getUnitList } from '#/api/unit';

function normalizeHeader(title: string) {
  return title.trim().toUpperCase().replaceAll('*', '').replaceAll(/\s+/g, ' ');
}

function isRoadUnitHeader(normalized: string) {
  const isUnitColumn =
    normalized.includes('单位') || normalized.includes('UNIT');
  if (!isUnitColumn) {
    return false;
  }
  return (
    normalized.includes('WAITING') ||
    (normalized.includes('YARD') && normalized.includes('STORAGE')) ||
    (normalized.includes('EXTRA') && normalized.includes('CHASSIS')) ||
    normalized.includes('待时') ||
    normalized.includes('堆存') ||
    normalized.includes('车架')
  );
}

function resolveUnitCode(raw: string, units: UnitApi.Unit[]) {
  const text = raw.trim();
  if (!text) {
    return null;
  }
  const lower = text.toLowerCase();
  const byCode = units.find((item) => item.code.toLowerCase() === lower);
  if (byCode) {
    return byCode.code;
  }
  const byName = units.find(
    (item) =>
      item.name.trim() === text || item.name.trim().toLowerCase() === lower,
  );
  return byName?.code ?? null;
}

/** 预览表：将 WAITING/YARD STORAGE/EXTRA CHASSIS 等单位列规范为主数据 code。 */
export async function enrichRoadPreviewUnits(
  headers: string[],
  rows: Record<string, string>[],
): Promise<{ normalized: number; rows: Record<string, string>[] }> {
  const unitIndexes = headers
    .map((title, index) =>
      isRoadUnitHeader(normalizeHeader(title)) ? index : -1,
    )
    .filter((index) => index >= 0);

  if (unitIndexes.length === 0 || rows.length === 0) {
    return { normalized: 0, rows };
  }

  const units = await getUnitList({ status: 1 });
  const nextRows = rows.map((row) => ({ ...row }));
  let normalized = 0;

  nextRows.forEach((row) => {
    unitIndexes.forEach((index) => {
      const key = `c${index}`;
      const raw = String(row[key] ?? '').trim();
      if (!raw) {
        return;
      }
      const code = resolveUnitCode(raw, units);
      if (code && code !== raw) {
        row[key] = code;
        normalized += 1;
      }
    });
  });

  return { normalized, rows: nextRows };
}
