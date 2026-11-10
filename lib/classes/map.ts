import { FIELDS, SEED_LIST_PRICE_RIALS, TEACHER, TOPIC_DEFS, cleanDescription, gradeWord, parseDuration, topicFromPlaylist } from "./catalog";

export type SeedLesson = {
  aparatHash: string;
  title: string;
  description: string;
  durationSec: number | null;
  grades: string[];
  fields: string[];
  sortOrder: number;
};

export type SeedCourse = {
  slug: string;
  title: string;
  summary: string;
  intro: string;
  teacher: string;
  grades: string[];
  fields: string[];
  kind: "TOPIC" | "GRADE";
  sortOrder: number;
  priceRials: number;
  isFree: boolean;
  lessons: SeedLesson[];
};

type Raw = { hash: string; title: string; playlist: string; newPlaylist: string; description: string };

const HIGH = ["g10", "g11", "g12", "konkur"];
const ALL_FIELDS: string[] = FIELDS.map((f) => f.id);

function uniq<T>(xs: T[]) {
  return [...new Set(xs)];
}

function gradeOf(playlist: string): { grades: string[]; fields: string[]; subject: "math" | "chem" | "calc" | null } | null {
  const p = playlist.trim();
  if (!p) return null;
  if (p.startsWith("شیمی")) {
    const g = p.includes("دوازدهم") ? "g12" : p.includes("یازدهم") ? "g11" : p.includes("دهم") ? "g10" : null;
    return { grades: g ? [g] : [], fields: ["riazi", "tajrobi"], subject: "chem" };
  }
  if (p.startsWith("محاسبات")) return { grades: [], fields: [], subject: "calc" };
  const word = p.includes("دوازدهم") ? "g12" : p.includes("یازدهم") ? "g11" : p.includes("دهم") ? "g10" : null;
  if (!word || !p.startsWith("ریاضی")) return null;
  const fields = p.includes("انسانی") ? ["ensani"] : ["riazi", "tajrobi"];
  return { grades: [word], fields, subject: "math" };
}

function titleGrade(title: string) {
  if (title.includes("دوازدهم")) return "g12";
  if (title.includes("یازدهم")) return "g11";
  if (title.includes("دهم")) return "g10";
  return null;
}

export function buildCatalog(plan: Raw[], plan2: Raw[], regroup: { hash: string; target: string }[], inventory: { hash: string; duration: string }[]): SeedCourse[] {
  const extra = new Map(regroup.map((r) => [r.hash, r.target]));
  const dur = new Map(inventory.map((r) => [r.hash, parseDuration(r.duration)]));
  const seen = new Set<string>();
  type Item = { topic: ReturnType<typeof topicFromPlaylist>; grades: string[]; fields: string[]; subject: "math" | "chem" | "calc" | null; lesson: Omit<SeedLesson, "sortOrder"> };
  const items: Item[] = [];

  const push = (row: Raw) => {
    const hash = row.hash.trim();
    if (!hash || seen.has(hash)) return;
    seen.add(hash);
    const topic = topicFromPlaylist(row.newPlaylist) || topicFromPlaylist(extra.get(hash) || "") || topicFromPlaylist(row.playlist);
    const gradePlaylist = topicFromPlaylist(row.playlist) ? "" : row.playlist;
    const g = gradeOf(gradePlaylist);
    let grades = g?.grades ?? [];
    let fields = g?.fields ?? [];
    const hinted = titleGrade(row.title);
    if (!grades.length) grades = hinted ? [hinted] : [...HIGH];
    if (!fields.length) {
      if (row.title.includes("انسانی") && !row.title.includes("تجربی")) fields = ["ensani"];
      else if (g?.subject === "calc" || topic?.slug === "mohasebat" || !topic) fields = [...ALL_FIELDS];
      else fields = ["riazi", "tajrobi"];
    }
    items.push({
      topic,
      grades,
      fields,
      subject: g?.subject ?? null,
      lesson: { aparatHash: hash, title: row.title.trim() || "جلسه", description: cleanDescription(row.description || ""), durationSec: dur.get(hash) ?? null, grades, fields },
    });
  };

  for (const row of plan2) push(row);
  for (const row of plan) push(row);

  const courses = new Map<string, SeedCourse>();
  const ensure = (key: string, data: Omit<SeedCourse, "lessons">) => {
    let c = courses.get(key);
    if (!c) {
      c = { ...data, lessons: [] };
      courses.set(key, c);
    }
    return c;
  };

  for (const item of items) {
    if (item.topic) {
      const c = ensure(item.topic.slug, {
        slug: item.topic.slug,
        title: item.topic.title,
        summary: "",
        intro: "",
        teacher: TEACHER,
        grades: [],
        fields: [],
        kind: "TOPIC",
        sortOrder: TOPIC_INDEX(item.topic.slug),
        priceRials: SEED_LIST_PRICE_RIALS,
        isFree: true,
      });
      c.lessons.push({ ...item.lesson, sortOrder: c.lessons.length });
      continue;
    }
    const grade = item.grades.length === 1 ? item.grades[0] : "";
    const ensani = item.fields.length === 1 && item.fields[0] === "ensani";
    const slug = item.subject === "chem" && grade ? `shimi-${grade.slice(1)}` : !grade ? "riazi-omumi" : `riazi-${grade.slice(1)}-${ensani ? "ensani" : "tajrobi"}`;
    const title = item.subject === "chem" && grade ? `شیمی ${gradeWord(grade)}` : !grade ? "کلاس ریاضی" : `ریاضی ${gradeWord(grade)} | ${ensani ? "انسانی" : "تجربی و ریاضی"}`;
    const c = ensure(slug, {
      slug,
      title,
      summary: "",
      intro: "",
      teacher: TEACHER,
      grades: item.grades,
      fields: item.fields,
      kind: "GRADE",
      sortOrder: 100 + (grade ? Number(grade.replace("g", "").replace("konkur", "13")) : 50),
      priceRials: SEED_LIST_PRICE_RIALS,
      isFree: true,
    });
    c.lessons.push({ ...item.lesson, sortOrder: c.lessons.length });
  }

  for (const c of courses.values()) {
    if (c.kind === "TOPIC") {
      c.grades = uniq(c.lessons.flatMap((l) => l.grades));
      c.fields = uniq(c.lessons.flatMap((l) => l.fields));
      const order = ["g10", "g11", "g12", "konkur", "g2", "g3", "g4", "g5", "g6", "g7", "g8", "g9"];
      c.grades.sort((a, b) => order.indexOf(a) - order.indexOf(b));
      c.fields.sort((a, b) => ALL_FIELDS.indexOf(a) - ALL_FIELDS.indexOf(b));
    }
    const n = c.lessons.length;
    c.summary = `${n} جلسهٔ ${c.title} با تدریس ${c.teacher}`;
    c.intro = `در این دوره «${c.title}» را جلسه به جلسه با ${c.teacher} یاد می‌گیری. مناسب ${c.grades.length ? "دانش‌آموزان " + c.grades.map(gradeWord).join("، ") : "دورهٔ دوم"} در رشتهٔ ${c.fields.map((f) => (f === "riazi" ? "ریاضی" : f === "tajrobi" ? "تجربی" : "انسانی")).join(" و ")}. پیشرفت تماشا و آزمون هر جلسه برایت ذخیره می‌شود.`;
  }

  return [...courses.values()].sort((a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title, "fa"));
}

function TOPIC_INDEX(slug: string) {
  const i = TOPIC_DEFS.findIndex((t) => t.slug === slug);
  return i < 0 ? 40 : i;
}

export function toRaw(row: Record<string, string>): Raw {
  return {
    hash: row.hash || "",
    title: row.new_title || row.current_title || row.title || "",
    playlist: row.playlist || "",
    newPlaylist: row.new_playlist || "",
    description: row.description || "",
  };
}
