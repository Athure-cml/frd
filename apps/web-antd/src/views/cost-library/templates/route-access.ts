import type { RouteLocationNormalized } from 'vue-router';

import type { CostMode } from '#/api/cost';

const COST_MODES = new Set<CostMode>(['fumigation', 'road', 'sea']);

function resolveTemplateMode(
  route: RouteLocationNormalized,
): CostMode | undefined {
  const metaMode = route.meta.costMode as CostMode | undefined;
  if (metaMode && COST_MODES.has(metaMode)) {
    return metaMode;
  }
  const paramMode = route.params.mode;
  if (typeof paramMode === 'string' && COST_MODES.has(paramMode as CostMode)) {
    return paramMode as CostMode;
  }
  const matched = route.path.match(
    /\/(?:cost-library|quotes\/library)\/templates\/(road|sea|fumigation)/,
  );
  if (matched?.[1] && COST_MODES.has(matched[1] as CostMode)) {
    return matched[1] as CostMode;
  }
  return undefined;
}

export function getTemplateRouteRequiredPermission(
  route: RouteLocationNormalized,
): null | string {
  const name = route.name?.toString() ?? '';
  const quote = name.startsWith('QuoteTemplate');
  if (!name.startsWith('CostTemplate') && !quote) {
    return null;
  }

  const mode = resolveTemplateMode(route);
  if (!mode) {
    return null;
  }

  const prefix = quote
    ? `quote:library:${mode}:template`
    : `cost:${mode}:template`;
  if (
    name === 'CostTemplateCreate' ||
    name === 'CostTemplateEdit' ||
    name === 'QuoteTemplateCreate' ||
    name === 'QuoteTemplateEdit'
  ) {
    return `${prefix}:edit`;
  }

  return `${prefix}:view`;
}

export function isTemplateRouteAllowed(
  route: RouteLocationNormalized,
  accessCodes: string[],
): boolean {
  const required = getTemplateRouteRequiredPermission(route);
  if (!required) {
    return true;
  }
  return accessCodes.includes(required);
}
