export type PermissionDictionaryItem = { code: string; name: string };

export function buildPermissionNameMap(
  permissions: PermissionDictionaryItem[],
): Map<string, string> {
  return new Map(permissions.map((item) => [item.code, item.name]));
}

export function formatPermissionLabel(
  code: string,
  nameMap: Map<string, string>,
  showCode = false,
): string {
  const name = nameMap.get(code) ?? code;
  if (showCode && name !== code) {
    return `${name} (${code})`;
  }
  return name;
}
