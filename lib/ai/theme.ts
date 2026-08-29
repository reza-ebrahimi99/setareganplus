/**
 * Theme-ready class helpers for the assistant shell (RTL / light / dark / responsive).
 * Reuses existing design tokens — no duplicated color systems.
 */

export const AI_THEME = {
  shell:
    "bg-[rgb(248_250_252_/_0.96)] text-foreground dark:bg-primary/95 dark:text-white",
  panel:
    "border-border bg-white/95 text-foreground dark:border-white/10 dark:bg-primary/90 dark:text-white",
  muted: "text-muted dark:text-white/70",
  fab: "border-secondary/40 bg-secondary text-primary",
  bubbleUser: "bg-primary text-white dark:bg-secondary dark:text-primary",
  bubbleAssistant:
    "border-border bg-white text-foreground dark:border-white/10 dark:bg-white/10 dark:text-white",
} as const;

export function aiThemeClass(
  key: keyof typeof AI_THEME,
  extra?: string,
): string {
  return extra ? `${AI_THEME[key]} ${extra}` : AI_THEME[key];
}
