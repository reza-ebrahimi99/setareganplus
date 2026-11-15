/** Iranian textbook grade that first teaches each skill. A student only walks skills with taughtGrade <= their grade - 1. */

export type SkillDef = {
  slug: string;
  title: string;
  taughtGrade: number;
  sortOrder: number;
  prereq?: string;
  courseSlug?: string;
  /** all, or comma list of riazi / tajrobi / ensani */
  fields: string;
};

export const GRADES = [5, 6, 7, 8, 9, 10, 11, 12] as const;
export type JourneyGrade = (typeof GRADES)[number];

export const GRADE_LABEL: Record<number, string> = {
  5: "پنجم ابتدایی",
  6: "ششم ابتدایی",
  7: "هفتم",
  8: "هشتم",
  9: "نهم",
  10: "دهم",
  11: "یازدهم",
  12: "دوازدهم",
};

export const FIELDS = [
  { id: "riazi", label: "ریاضی" },
  { id: "tajrobi", label: "تجربی" },
  { id: "ensani", label: "انسانی" },
] as const;

export const FIELD_LABEL: Record<string, string> = { riazi: "ریاضی", tajrobi: "تجربی", ensani: "انسانی" };

export const FOLLOW: { id: string; label: string }[] = [
  { id: "NEW", label: "تماس گرفته نشده" },
  { id: "CALLED", label: "تماس گرفته شد" },
  { id: "BOOKED", label: "جلسه رزرو شد" },
  { id: "ENROLLED", label: "ثبت‌نام کرد" },
];

export const SKILLS: SkillDef[] = [
  { slug: "add", title: "جمع و تفریق", taughtGrade: 1, sortOrder: 10, fields: "all" },
  { slug: "times", title: "جدول ضرب", taughtGrade: 3, sortOrder: 15, prereq: "add", courseSlug: "mohasebat", fields: "all" },
  { slug: "mul", title: "ضرب و تقسیم", taughtGrade: 3, sortOrder: 20, prereq: "times", courseSlug: "mohasebat", fields: "all" },
  { slug: "frac", title: "کسر", taughtGrade: 4, sortOrder: 30, prereq: "mul", courseSlug: "mohasebat", fields: "all" },
  { slug: "simplify", title: "مقایسه و ساده‌کردن کسر", taughtGrade: 4, sortOrder: 35, prereq: "frac", fields: "all" },
  { slug: "dec", title: "اعشار", taughtGrade: 4, sortOrder: 40, prereq: "frac", fields: "all" },
  { slug: "word", title: "مسئلهٔ کلامی", taughtGrade: 4, sortOrder: 50, prereq: "add", fields: "all" },
  { slug: "pct", title: "درصد", taughtGrade: 5, sortOrder: 60, prereq: "dec", fields: "all" },
  { slug: "order", title: "ترتیب عملیات", taughtGrade: 6, sortOrder: 65, prereq: "mul", fields: "all" },
  { slug: "ratio", title: "نسبت و تناسب", taughtGrade: 6, sortOrder: 66, prereq: "pct", fields: "all" },
  { slug: "neg", title: "اعداد منفی", taughtGrade: 7, sortOrder: 70, prereq: "add", fields: "all" },
  { slug: "pow", title: "توان و جذر", taughtGrade: 7, sortOrder: 80, prereq: "mul", courseSlug: "mohasebat", fields: "all" },
  { slug: "exp", title: "قوانین توان", taughtGrade: 8, sortOrder: 85, prereq: "pow", fields: "all" },
  { slug: "alg", title: "عبارت جبری", taughtGrade: 7, sortOrder: 90, prereq: "mul", fields: "all" },
  { slug: "eq", title: "معادله", taughtGrade: 7, sortOrder: 100, prereq: "alg", fields: "all" },
  { slug: "rat", title: "اعداد گویا", taughtGrade: 8, sortOrder: 110, prereq: "neg", fields: "all" },
  { slug: "ident", title: "اتحاد و تجزیه", taughtGrade: 9, sortOrder: 120, prereq: "alg", fields: "all" },
  { slug: "negexp", title: "توان منفی", taughtGrade: 9, sortOrder: 122, prereq: "exp", fields: "all" },
  { slug: "ineq", title: "نامعادله", taughtGrade: 9, sortOrder: 124, prereq: "eq", fields: "all" },
  { slug: "radical", title: "رادیکال", taughtGrade: 9, sortOrder: 126, prereq: "pow", fields: "all" },
  { slug: "line", title: "معادله خط", taughtGrade: 9, sortOrder: 130, prereq: "eq", courseSlug: "hendese", fields: "all" },
  { slug: "quad", title: "معادله درجه ۲", taughtGrade: 10, sortOrder: 140, prereq: "ident", courseSlug: "moadele", fields: "riazi,tajrobi" },
  { slug: "fn", title: "تابع", taughtGrade: 10, sortOrder: 150, prereq: "line", courseSlug: "tabe", fields: "riazi,tajrobi" },
  { slug: "trig", title: "مثلثات", taughtGrade: 10, sortOrder: 160, prereq: "rat", courseSlug: "mosallasat", fields: "riazi,tajrobi" },
  { slug: "log", title: "لگاریتم", taughtGrade: 11, sortOrder: 170, prereq: "pow", courseSlug: "logaritm", fields: "riazi,tajrobi" },
  { slug: "lim", title: "حد و پیوستگی", taughtGrade: 11, sortOrder: 180, prereq: "fn", courseSlug: "had", fields: "riazi" },
];

export const skillBySlug = (slug: string) => SKILLS.find((s) => s.slug === slug);

export function fieldOk(skill: SkillDef, field: string) {
  if (skill.fields === "all") return true;
  return skill.fields.split(",").includes(field);
}

/** Skills the student has already been taught: up to the end of the previous grade, and only for their field. */
export function pathSkills(grade: number, field: string) {
  return SKILLS.filter((s) => s.taughtGrade <= grade - 1 && fieldOk(s, field)).sort((a, b) => a.sortOrder - b.sortOrder);
}

export function needsField(grade: number) {
  return grade >= 10;
}

export function isJourneyGrade(n: number): n is JourneyGrade {
  return (GRADES as readonly number[]).includes(n);
}

export function ceilingBlurb(grade: number, field: string) {
  if (grade <= 6) return "عدد منفی، درصد و توان از کتاب‌های بعدی‌اند و در این سفر نیستند.";
  if (grade <= 9) return "اتحاد، معادلهٔ خط و تابع مال کتاب‌های بعدند و اینجا نیستند.";
  if (field === "ensani") return "مثلثات، لگاریتم و حد برای این رشته روی نقشه نیستند.";
  if (field === "tajrobi") return "حد مال کتاب یازدهم ریاضی است و در این رشته نیست. مشتق هم مال کتاب دوازدهم است.";
  return "مشتق مال کتاب دوازدهم است و در این سفر نیست.";
}

export const COURSE_TITLE: Record<string, string> = {
  mohasebat: "محاسبات سریع",
  moadele: "معادله درجه ۲",
  tabe: "تابع",
  hendese: "هندسه تحلیلی",
  mosallasat: "مثلثات",
  logaritm: "لگاریتم و تابع نمایی",
  had: "حد و پیوستگی",
};

export const STATION_SIZE = 3;
export const DRILL_SIZE = 2;

/** Dotted trail on the antique map, as percentages of the image. One marker is placed per station along this line. */
export const TRAIL: [number, number][] = [
  [53.06, 16.25],
  [50.0, 20.31],
  [48.33, 24.22],
  [48.61, 28.59],
  [48.61, 32.81],
  [48.61, 37.34],
  [49.72, 41.41],
  [50.83, 44.38],
  [54.44, 47.66],
  [55.56, 50.78],
  [52.5, 53.91],
  [48.33, 57.03],
  [50.0, 60.16],
  [54.17, 64.06],
  [55.56, 67.97],
  [51.39, 71.09],
  [48.33, 75.0],
  [46.67, 79.69],
  [46.11, 84.53],
];

export function stationPoints(n: number): { x: number; y: number }[] {
  const path = TRAIL;
  if (n <= 1) return [{ x: path[0][0], y: path[0][1] }];
  const seg = [0];
  for (let i = 1; i < path.length; i++) {
    const dx = path[i][0] - path[i - 1][0];
    const dy = path[i][1] - path[i - 1][1];
    seg.push(seg[i - 1] + Math.hypot(dx, dy));
  }
  const total = seg[seg.length - 1] || 1;
  return Array.from({ length: n }, (_, i) => {
    const dist = (i / (n - 1)) * total;
    let k = 1;
    while (k < seg.length - 1 && seg[k] < dist) k += 1;
    const span = seg[k] - seg[k - 1] || 1;
    const u = Math.min(1, Math.max(0, (dist - seg[k - 1]) / span));
    const a = path[k - 1];
    const b = path[k];
    return { x: a[0] + (b[0] - a[0]) * u, y: a[1] + (b[1] - a[1]) * u };
  });
}

export type StatusId = "strong" | "mid" | "grow";

export function statusOf(ratio: number): StatusId {
  if (ratio >= 0.7) return "strong";
  if (ratio >= 0.5) return "mid";
  return "grow";
}

export const STATUS_LABEL: Record<StatusId, string> = {
  strong: "قدرت",
  mid: "در مسیر ستاره",
  grow: "نقطهٔ رشد",
};
