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
  const corpus = normalize(texts.slice(-10).join("\n"));
  const facts: AtrinMemoryFact[] = [];

  const name =
    corpus.match(
      /(?:اسمم|من)\s+([آابپتثجچحخدذرزژسشصضطظعغفقکگلمنوهیءٔ‌]{2,16})(?:\s|$)/,
    ) ??
    corpus.match(
      /(?:من)\s+([آابپتثجچحخدذرزژسشصضطظعغفقکگلمنوهیءٔ‌]{2,16})\s+هستم/,
    );
  if (name?.[1] && !/پایه|کلاس|ریاضی|دانش/.test(name[1])) {
    facts.push({ id: "name", label: "نام", value: name[1] });
  }

  const grade = corpus.match(
    /(?:کلاس|پایه)\s*(اول|دوم|سوم|چهارم|پنجم|ششم|هفتم|هشتم|نهم|دهم|یازدهم|دوازدهم|\d{1,2})/,
  );
  if (grade?.[1]) {
    facts.push({ id: "grade", label: "پایه", value: `پایه ${grade[1]}` });
  }

  const major = corpus.match(
    /(?:رشته)\s*(ریاضی|تجربی|انسانی|فنی|هنر)/,
  );
  if (major?.[1]) {
    facts.push({ id: "major", label: "رشته", value: major[1] });
  }

  if (/تیزهوشان|نمونه دولتی/.test(corpus)) {
    facts.push({
      id: "gifted",
      label: "علاقه",
      value: "علاقه‌مند به تیزهوشان / نمونه دولتی",
    });
  }
  if (/ضعیفم|ضعف|مشکل دارم/.test(corpus) && /ریاضی/.test(corpus)) {
    facts.push({ id: "weak-math", label: "ضعف", value: "ریاضی" });
  }
  if (/ضعیفم|ضعف|مشکل دارم/.test(corpus) && /فیزیک/.test(corpus)) {
    facts.push({ id: "weak-physics", label: "ضعف", value: "فیزیک" });
  }
  if (/علاقه|دوست دارم|علاقه‌مند/.test(corpus) && /ریاضی/.test(corpus)) {
    facts.push({ id: "fav-math", label: "علاقه درسی", value: "ریاضی" });
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
  if (/کنکور/.test(corpus)) {
    facts.push({ id: "konkur", label: "هدف", value: "آمادگی کنکور" });
  }
  if (/توضیح ساده|ساده بگو|مثل مبتدی/.test(corpus)) {
    facts.push({
      id: "style-simple",
      label: "سبک توضیح",
      value: "توضیح ساده",
    });
  }
  if (/گام به گام|قدم به قدم|مرحله/.test(corpus)) {
    facts.push({
      id: "style-steps",
      label: "سبک توضیح",
      value: "گام‌به‌گام",
    });
  }

  return facts.slice(0, 8);
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
