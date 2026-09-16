/** POR 列表匹配：remark 为「城市,州」成对逗号分隔，如 NEW YORK,NY,NORFOLK,VA */

export function normalizePor(value: string) {
  return value
    .trim()
    .toUpperCase()
    .replaceAll(/\s+/g, ' ')
    .replaceAll(/,\s*/g, ',');
}

export function parsePorEntries(remark: string) {
  const tokens = remark
    .trim()
    .split(/[,，\n;]+/)
    .map((part) => part.trim())
    .filter(Boolean);

  const entries: string[] = [];
  for (let i = 0; i + 1 < tokens.length; i += 2) {
    entries.push(normalizePor(`${tokens[i]},${tokens[i + 1]}`));
  }
  return entries;
}

export function matchesPorInList(
  por: string | undefined,
  remark: string | undefined,
) {
  if (!por?.trim() || !remark?.trim()) {
    return false;
  }
  const normalizedPor = normalizePor(por);
  return parsePorEntries(remark).some((entry) => entry === normalizedPor);
}
