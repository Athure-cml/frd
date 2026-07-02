export function readThemeColor(token: string, fallback: string) {
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue(token)
    .trim();
  return raw ? `hsl(${raw})` : fallback;
}

export function readThemeColors() {
  return {
    destructive: readThemeColor('--destructive', '#FF4D4F'),
    muted: readThemeColor('--muted-foreground', '#71717A'),
    primary: readThemeColor('--primary', '#006FE6'),
    success: readThemeColor('--success', '#4CD080'),
    warning: readThemeColor('--warning', '#F0B429'),
  };
}
