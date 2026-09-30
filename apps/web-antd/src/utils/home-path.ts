const LEGACY_HOME_PATHS = new Set(['/analytics', '/dashboard/analytics']);

export const APP_HOME_PATH = '/workspace';

export function resolveAppHomePath(homePath?: null | string) {
  const path = homePath?.trim();
  if (!path || LEGACY_HOME_PATHS.has(path)) {
    return APP_HOME_PATH;
  }
  return path;
}
