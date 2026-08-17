import type { GlobalPortApi } from '#/api/master-data/global-port';

/** 港口导入去重键分隔符 */
const DEDUPE_SEP = '\u0001';

/** 与 Excel「类型」列对齐的规范化类型码 */
export function normalizeGlobalPortTypeForDedupe(raw?: null | string) {
  const text = String(raw ?? '')
    .replaceAll(/[\u200B-\u200D\uFEFF]/g, '')
    .trim();
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

export function normalizeGlobalPortDedupePart(raw?: null | string) {
  return String(raw ?? '')
    .replaceAll(/[\u200B-\u200D\uFEFF]/g, '')
    .trim()
    .toUpperCase();
}

export function buildGlobalPortDedupeKey(
  name?: null | string,
  portType?: null | string,
  country?: null | string,
) {
  return [
    normalizeGlobalPortDedupePart(name),
    normalizeGlobalPortTypeForDedupe(portType),
    normalizeGlobalPortDedupePart(country),
  ].join(DEDUPE_SEP);
}

export function buildGlobalPortDedupeKeyFromRecord(
  item: Pick<GlobalPortApi.GlobalPort, 'countryRegion' | 'nameEn' | 'portType'>,
) {
  return buildGlobalPortDedupeKey(
    item.nameEn,
    item.portType,
    item.countryRegion,
  );
}

export const GLOBAL_PORT_IMPORT_DEDUPE_HEADERS = ['名称', '类型', '国家'];
