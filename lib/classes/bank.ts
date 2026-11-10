/** Pure helpers for the institute question bank. No network, no secrets. */

export type BankInput = {
  id: number | string;
  grade?: number;
  field?: string;
  institute?: string | null;
  year?: number | null;
  source_ref?: string | null;
  difficulty?: number | null;
  chapters?: { code?: string; title?: string }[] | null;
  text?: string;
  options?: string[] | null;
  correct?: number | null;
  solution?: string | null;
  image?: string | null;
  solution_images?: string[] | null;
  needs_review?: boolean;
};

export type BankDraft = {
  externalId: string;
  grade: number;
  field: string;
  difficulty: number;
  chapters: string[];
  prompt: string;
  solution: string | null;
  sourceLabel: string;
  options: { text: string; correct: boolean }[];
  image: string | null;
  solutionImages: string[];
};

const FIELD: Record<string, string> = { riazi: "riazi", tajrobi: "tajrobi", ensani: "ensani" };
const INSTITUTE: Record<string, string> = { ghalamchi: "قلم‌چی" };

export function courseForChapter(title: string): string | null {
  const t = title.replace(/\u200c/g, "");
  if (t.includes("مشتق")) return "moshtagh";
  if (t.includes("حد")) return "had";
  if (t.includes("مثلثات")) return "mosallasat";
  if (t.includes("لگاریتم") || t.includes("نمایی")) return "logaritm";
  if (t.includes("دنباله")) return "donbale";
  if (t.includes("شمارش") || t.includes("احتمال") || t.includes("ترکیبیات")) return "shomaresh";
  if (t.includes("تحلیلی") || t.includes("مقاطع مخروطی")) return "hendese";
  if (t.includes("سهمی") || t.includes("معادله") || t.includes("درجه دوم") || t.includes("درجه ۲")) return "moadele";
  if (t.includes("تابع") || t.includes("توابع")) return "tabe";
  return null;
}

export function sourceLabel(institute: string | null | undefined, year: number | null | undefined, sourceRef: string | null | undefined): string {
  const key = (institute || "").trim().toLowerCase();
  const name = INSTITUTE[key] || (sourceRef && /ghalamchi|قلم/i.test(sourceRef) ? "قلم‌چی" : "");
  if (!name) return "";
  const y = Number(year);
  return Number.isFinite(y) && y > 1300 ? `آزمون ${name} ${y}` : `آزمون ${name}`;
}

/** Returns null when the row must not be shown (needs review, or it is not a usable 4-choice item). */
export function normalizeBankItem(raw: BankInput): BankDraft | null {
  if (raw.needs_review) return null;
  const externalId = String(raw.id ?? "").trim();
  if (!/^\d+$/.test(externalId)) return null;
  const prompt = String(raw.text ?? "").trim();
  const options = Array.isArray(raw.options) ? raw.options.map((t) => String(t ?? "").trim()).filter(Boolean) : [];
  const correct = Number(raw.correct);
  if (prompt.length < 2 || options.length < 2 || options.length > 6 || !Number.isInteger(correct) || correct < 1 || correct > options.length) return null;
  const field = FIELD[String(raw.field ?? "").trim().toLowerCase()] ?? "";
  if (!field) return null;
  const chapters = [...new Set((raw.chapters ?? []).map((c) => String(c?.code ?? "").trim()).filter(Boolean))];
  return {
    externalId,
    grade: Number(raw.grade) || 0,
    field,
    difficulty: Math.min(5, Math.max(1, Number(raw.difficulty) || 2)),
    chapters,
    prompt: prompt.slice(0, 8000),
    solution: raw.solution ? String(raw.solution).slice(0, 8000) : null,
    sourceLabel: sourceLabel(raw.institute, raw.year, raw.source_ref).slice(0, 80),
    options: options.map((text, i) => ({ text: text.slice(0, 2000), correct: i + 1 === correct })),
    image: typeof raw.image === "string" && raw.image.startsWith("https://") ? raw.image : null,
    solutionImages: (raw.solution_images ?? []).filter((u): u is string => typeof u === "string" && u.startsWith("https://")),
  };
}

export function pickMixed<T extends { difficulty: number }>(pool: T[], n: number, rng: () => number = Math.random): T[] {
  const buckets = new Map<number, T[]>();
  for (const q of pool) {
    const list = buckets.get(q.difficulty) ?? [];
    list.push(q);
    buckets.set(q.difficulty, list);
  }
  for (const list of buckets.values()) shuffle(list, rng);
  const order = [...buckets.keys()].sort((a, b) => a - b);
  const picked: T[] = [];
  while (picked.length < n) {
    let grew = false;
    for (const d of order) {
      const list = buckets.get(d)!;
      if (list.length && picked.length < n) {
        picked.push(list.pop()!);
        grew = true;
      }
    }
    if (!grew) break;
  }
  return shuffle(picked, rng);
}

export function pickForStudent<T extends { field: string; difficulty: number }>(pool: T[], n: number, field: string | null, rng: () => number = Math.random): T[] {
  if (!field) return pickMixed(pool, n, rng);
  const mine = pool.filter((q) => q.field === field);
  const other = pool.filter((q) => q.field !== field);
  const first = pickMixed(mine, n, rng);
  if (first.length >= n) return first;
  return shuffle([...first, ...pickMixed(other, n - first.length, rng)], rng);
}

export function shuffle<T>(list: T[], rng: () => number = Math.random): T[] {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function allowedImageUrl(url: string, apiOrigin: string): boolean {
  try {
    const u = new URL(url);
    const host = new URL(apiOrigin).host;
    return u.protocol === "https:" && u.host === host;
  } catch {
    return false;
  }
}
