const FRD_LOGO_FILL = {
  dark: '#FAFAFA',
  light: '#006FE6',
} as const;

function createFrdLogoSvg(fill: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 88 36" role="img" aria-label="FRD"><text font-family="Georgia, 'Times New Roman', serif" font-style="italic" font-weight="700" font-size="28" fill="${fill}"><tspan x="4" y="28">F</tspan><tspan dx="14">R</tspan><tspan dx="14">D</tspan></text></svg>`;

  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

/** 侧栏收起时显示的 FRD 斜体图标 */
export const FRD_LOGO_SRC = createFrdLogoSvg(FRD_LOGO_FILL.light);

/** 暗色侧栏收起时显示的 FRD 斜体图标 */
export const FRD_LOGO_SRC_DARK = createFrdLogoSvg(FRD_LOGO_FILL.dark);
