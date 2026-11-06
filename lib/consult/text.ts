const KEYS = ["name", "student", "date", "time", "mode", "consultant", "code", "grade"] as const;
export type SmsVars = Partial<Record<(typeof KEYS)[number], string>>;

/** Renders an admin-edited template. Unknown braces are left so a typo stays visible. */
export function renderSms(template: string, vars: SmsVars): string {
  const text = template.replace(/\{(name|student|date|time|mode|consultant|code|grade)\}/g, (_, k: keyof SmsVars) => (vars[k] ?? "").trim());
  return text.replace(/[ \t]{2,}/g, " ").trim().slice(0, 700);
}

export function clipParam(v: string): string {
  const t = v.trim();
  return t.length > 25 ? t.slice(0, 24) + "…" : t;
}

export function maskMobile(mobile: string): string {
  if (!/^09\d{9}$/.test(mobile)) return "";
  return `${mobile.slice(0, 4)}***${mobile.slice(7)}`;
}
