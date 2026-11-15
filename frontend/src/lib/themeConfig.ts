// ---------------------------------------------------------------------------
// CHIRON v2.0 - Theme Configuration
// All hex values sourced from the CHIRON operational theme specification.
// ---------------------------------------------------------------------------

export type ChironThemeId =
  | "orbital-daylight"
  | "deep-space"
  | "circadian-red";

export interface ThemeColors {
  surface: string;
  panel: string;
  panelBorder: string;
  inkPrimary: string;
  inkSecondary: string;
  inkTertiary: string;
  accentOk: string;
  accentWarn: string;
  accentCrit: string;
  accentInfo: string;
  accentOkRgb: [number, number, number];
  accentWarnRgb: [number, number, number];
  accentCritRgb: [number, number, number];
  accentInfoRgb: [number, number, number];
  glowOk: string;
  glowWarn: string;
  glowCrit: string;
  glowAbstain: string;
  canvasBg: string;
  wireframe: string;
  gridLine: string;
}

export interface ChironTheme {
  id: ChironThemeId;
  label: string;
  colors: ThemeColors;
}

export const ORBITAL_DAYLIGHT: ChironTheme = {
  id: "orbital-daylight",
  label: "Orbital Daylight",
  colors: {
    surface: "#F4F6F8",
    panel: "rgba(255,255,255,0.88)",
    panelBorder: "rgba(15,23,42,0.08)",
    inkPrimary: "#0F172A",
    inkSecondary: "#475569",
    inkTertiary: "#94A3B8",
    accentOk: "#0D9488",
    accentWarn: "#D97706",
    accentCrit: "#E11D48",
    accentInfo: "#0284C7",
    accentOkRgb: [13, 148, 136],
    accentWarnRgb: [217, 119, 6],
    accentCritRgb: [225, 29, 72],
    accentInfoRgb: [2, 132, 199],
    glowOk: "rgba(13,148,136,0.35)",
    glowWarn: "rgba(217,119,6,0.35)",
    glowCrit: "rgba(225,29,72,0.45)",
    glowAbstain: "rgba(148,163,184,0.3)",
    canvasBg: "#E2E8F0",
    wireframe: "rgba(15,23,42,0.12)",
    gridLine: "rgba(15,23,42,0.06)",
  },
};

export const DEEP_SPACE: ChironTheme = {
  id: "deep-space",
  label: "Deep Space",
  colors: {
    surface: "#070A0E",
    panel: "rgba(13,18,26,0.86)",
    panelBorder: "rgba(241,245,249,0.06)",
    inkPrimary: "#F1F5F9",
    inkSecondary: "#94A3B8",
    inkTertiary: "#334155",
    accentOk: "#10B981",
    accentWarn: "#F59E0B",
    accentCrit: "#F43F5E",
    accentInfo: "#06B6D4",
    accentOkRgb: [16, 185, 129],
    accentWarnRgb: [245, 158, 11],
    accentCritRgb: [244, 63, 94],
    accentInfoRgb: [6, 182, 212],
    glowOk: "rgba(16,185,129,0.35)",
    glowWarn: "rgba(245,158,11,0.35)",
    glowCrit: "rgba(244,63,94,0.45)",
    glowAbstain: "rgba(51,65,85,0.4)",
    canvasBg: "#050810",
    wireframe: "rgba(241,245,249,0.06)",
    gridLine: "rgba(241,245,249,0.03)",
  },
};

export const CIRCADIAN_RED: ChironTheme = {
  id: "circadian-red",
  label: "Circadian Red",
  colors: {
    surface: "#0C0607",
    panel: "rgba(24,10,12,0.92)",
    panelBorder: "rgba(254,205,211,0.08)",
    inkPrimary: "#FECDD3",
    inkSecondary: "#FDA4AF",
    inkTertiary: "#6B2130",
    accentOk: "#FB923C",
    accentWarn: "#EF4444",
    accentCrit: "#EF4444",
    accentInfo: "#EAB308",
    accentOkRgb: [251, 146, 60],
    accentWarnRgb: [239, 68, 68],
    accentCritRgb: [239, 68, 68],
    accentInfoRgb: [234, 179, 8],
    glowOk: "rgba(251,146,60,0.35)",
    glowWarn: "rgba(239,68,68,0.35)",
    glowCrit: "rgba(239,68,68,0.5)",
    glowAbstain: "rgba(107,33,48,0.4)",
    canvasBg: "#0A0405",
    wireframe: "rgba(254,205,211,0.06)",
    gridLine: "rgba(254,205,211,0.03)",
  },
};

export const THEMES: Record<ChironThemeId, ChironTheme> = {
  "orbital-daylight": ORBITAL_DAYLIGHT,
  "deep-space": DEEP_SPACE,
  "circadian-red": CIRCADIAN_RED,
};

export function getTheme(id: ChironThemeId): ChironTheme {
  return THEMES[id];
}

/**
 * Convert a hex color string to a normalized [r, g, b] triple (0-1 range)
 * for use with Three.js Color constructor.
 */
export function hexToNormalized(hex: string): [number, number, number] {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.substring(0, 2), 16) / 255;
  const g = parseInt(clean.substring(2, 4), 16) / 255;
  const b = parseInt(clean.substring(4, 6), 16) / 255;
  return [r, g, b];
}

/**
 * Get the Three.js-compatible background color for the canvas
 * based on the current theme.
 */
export function getCanvasBgHex(themeId: ChironThemeId): string {
  return THEMES[themeId].colors.canvasBg;
}

/**
 * Determine the glow color for a Bayesian posterior score.
 * score > 70: ok (teal/green)
 * score 40-70: warn (amber)
 * score < 40: crit (crimson)
 * score === null | undefined: abstain
 */
export function scoreToGlowConfig(
  score: number | null | undefined,
  theme: ChironTheme
): {
  color: string;
  colorRgb: [number, number, number];
  pulseSpeed: number; // radians per second
  scale: number;
  isAbstain: boolean;
} {
  if (score === null || score === undefined) {
    return {
      color: theme.colors.inkTertiary,
      colorRgb: hexToNormalized(theme.colors.inkTertiary),
      pulseSpeed: 1.0,
      scale: 1.0,
      isAbstain: true,
    };
  }
  if (score > 70) {
    return {
      color: theme.colors.accentOk,
      colorRgb: hexToNormalized(theme.colors.accentOk),
      pulseSpeed: 1.5,
      scale: 1.0,
      isAbstain: false,
    };
  }
  if (score >= 40) {
    return {
      color: theme.colors.accentWarn,
      colorRgb: hexToNormalized(theme.colors.accentWarn),
      pulseSpeed: 3.0,
      scale: 1.1,
      isAbstain: false,
    };
  }
  return {
    color: theme.colors.accentCrit,
    colorRgb: hexToNormalized(theme.colors.accentCrit),
    pulseSpeed: 6.0,
    scale: 1.25,
    isAbstain: false,
  };
}

/**
 * Apply a CHIRON theme to the document by setting data-theme attribute.
 */
export function applyThemeToDocument(themeId: ChironThemeId): void {
  document.documentElement.setAttribute("data-theme", themeId);
}
