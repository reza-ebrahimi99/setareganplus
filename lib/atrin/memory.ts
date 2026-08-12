export type AtrinMemoryFact = {
  id: string;
  label: string;
  value: string;
};

const STORAGE_KEY = "atrin-memory-v1";

function normalize(text: string): string {
  return text
    .replace(/ي/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/[\u200c\u200f]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Extract lightweight client-only memory hints from user text. */
export function extractMemoryFacts(texts: readonly string[]): AtrinMemoryFact[] {
  const corpus = normalize(texts.slice(-8).join("\n"));
  const facts: AtrinMemoryFact[] = [];

  const grade = corpus.match(
    /(?:کلاس|پایه)\s*(اول|دوم|سوم|چهارم|پنجم|ششم|هفتم|هشتم|نهم|دهم|یازدهم|دوازدهم|\d{1,2})/,
  );
  if (grade?.[1]) {
    facts.push({ id: "grade", label: "پایه", value: `پایه ${grade[1]}` });
  }

  if (/تیزهوشان|نمونه دولتی/.test(corpus)) {
    facts.push({
      id: "gifted",
      label: "علاقه",
      value: "علاقه‌مند به تیزهوشان / نمونه دولتی",
    });
  }
  if (/ریاضی|محاسبه/.test(corpus)) {
    facts.push({ id: "math", label: "نیاز", value: "کمک در ریاضی" });
  }
  if (/قلم\s*چی|قلمچی/.test(corpus)) {
    facts.push({ id: "qalamchi", label: "خدمت", value: "قلم‌چی" });
  }
  if (/فرزندم|دخترم|پسرم|والدین/.test(corpus)) {
    facts.push({ id: "parent", label: "نقش", value: "گفتگوی والدین" });
  }
  if (/برنامه مطالعاتی|برنامه ریزی/.test(corpus)) {
    facts.push({ id: "plan", label: "هدف", value: "برنامه مطالعاتی" });
  }

  return facts.slice(0, 6);
}

export function loadMemoryOverrides(): AtrinMemoryFact[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is AtrinMemoryFact =>
        Boolean(item) &&
        typeof item === "object" &&
        typeof (item as AtrinMemoryFact).id === "string" &&
        typeof (item as AtrinMemoryFact).label === "string" &&
        typeof (item as AtrinMemoryFact).value === "string",
    );
  } catch {
    return [];
  }
}

export function saveMemoryOverrides(facts: AtrinMemoryFact[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(facts));
  } catch {
    // ignore
  }
}

export function clearMemoryStorage(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function mergeMemoryFacts(
  extracted: AtrinMemoryFact[],
  overrides: AtrinMemoryFact[],
): AtrinMemoryFact[] {
  const map = new Map<string, AtrinMemoryFact>();
  for (const fact of extracted) map.set(fact.id, fact);
  for (const fact of overrides) map.set(fact.id, fact);
  return [...map.values()].slice(0, 8);
}
