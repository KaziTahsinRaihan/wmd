// Shared theme + text-size model for the exam portals (listening, writing).
//
// Contrast modes mirror the real IELTS computer-delivered test:
//   bw — black on white   (default; highlight = white on maroon)
//   wb — white on black   (highlight = yellow)
//   yb — yellow on black  (highlight = white)

export type ThemeKey = "bw" | "wb" | "yb";
export type SizeKey = "regular" | "large" | "xl";

export type Theme = {
  pageBg: string;
  contentBg: string;
  panelBg: string;
  fg: string;
  muted: string;
  border: string;
  chromeTopBg: string;
  chromeNavBg: string;
  chromeStatusBg: string;
  chromeFg: string;
  chromeBorder: string;
  inputBg: string;
  inputFg: string;
  inputBorder: string;
  accent: string;
  accentSoftBg: string;
  hlBg: string;
  hlFg: string;
};

export const THEMES: Record<ThemeKey, Theme> = {
  bw: {
    pageBg: "#fbfbfb",
    contentBg: "#ffffff",
    panelBg: "#fcfbf7",
    fg: "#1f1f1f",
    muted: "#555555",
    border: "#d9d9d9",
    chromeTopBg: "#ffffff",
    chromeNavBg: "#f3f3f3",
    chromeStatusBg: "#e9e9e9",
    chromeFg: "#333333",
    chromeBorder: "#d9d9d9",
    inputBg: "#ffffff",
    inputFg: "#1f1f1f",
    inputBorder: "#9a9a9a",
    accent: "#1565c0",
    accentSoftBg: "#e8f1fb",
    hlBg: "#70183D",
    hlFg: "#ffffff",
  },
  wb: {
    pageBg: "#000000",
    contentBg: "#000000",
    panelBg: "#101010",
    fg: "#ffffff",
    muted: "#bdbdbd",
    border: "#444444",
    chromeTopBg: "#0d0d0d",
    chromeNavBg: "#161616",
    chromeStatusBg: "#161616",
    chromeFg: "#eaeaea",
    chromeBorder: "#444444",
    inputBg: "#1a1a1a",
    inputFg: "#ffffff",
    inputBorder: "#666666",
    accent: "#6aa9ff",
    accentSoftBg: "#13243a",
    hlBg: "#f2d600",
    hlFg: "#000000",
  },
  yb: {
    pageBg: "#000000",
    contentBg: "#000000",
    panelBg: "#0d0d0d",
    fg: "#ffd400",
    muted: "#c9a227",
    border: "#5a4a00",
    chromeTopBg: "#0d0d0d",
    chromeNavBg: "#161616",
    chromeStatusBg: "#161616",
    chromeFg: "#ffd400",
    chromeBorder: "#5a4a00",
    inputBg: "#1a1500",
    inputFg: "#ffd400",
    inputBorder: "#7a6500",
    accent: "#ffd400",
    accentSoftBg: "#2a2200",
    hlBg: "#ffffff",
    hlFg: "#000000",
  },
};

export const SIZE_PX: Record<SizeKey, number> = {
  regular: 16,
  large: 18.5,
  xl: 21,
};
