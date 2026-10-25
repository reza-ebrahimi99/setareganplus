import type { CSSProperties } from "react";

/** Colour presets for form pages. Navy + gold is the site's own look; others keep the gold call-to-action. */
export type FormTheme = { key: string; label: string; accent: string; soft: string; h1: string; h2: string };
export const THEMES: FormTheme[] = [
  { key: "navy", label: "سرمه‌ای و طلایی", accent: "#1b2a5c", soft: "#eef1f9", h1: "#0f1a3d", h2: "#26408f" },
  { key: "royal", label: "آبی", accent: "#2346b0", soft: "#eaf0fd", h1: "#14286b", h2: "#3361d8" },
  { key: "emerald", label: "سبز", accent: "#0f766e", soft: "#e7f6f3", h1: "#073b3a", h2: "#11806f" },
  { key: "crimson", label: "زرشکی (قلم‌چی)", accent: "#a8262e", soft: "#fbecec", h1: "#4a0f17", h2: "#a8262e" },
  { key: "violet", label: "بنفش", accent: "#5b3cc4", soft: "#f0ecfc", h1: "#25145e", h2: "#6d4ee0" },
  { key: "sunset", label: "نارنجی", accent: "#c2410c", soft: "#fdf0e8", h1: "#4c1a07", h2: "#d4561c" },
];
export const themeOf = (k?: string | null) => THEMES.find((t) => t.key === k) ?? THEMES[0];
export const themeVars = (k?: string | null) => {
  const t = themeOf(k);
  return { "--fa": t.accent, "--fa-soft": t.soft, "--fh1": t.h1, "--fh2": t.h2 } as CSSProperties;
};
