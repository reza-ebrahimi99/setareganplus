/**
 * Client-safe grade/major options for Registration Engine.
 * Mirrors website defaults without importing Prisma.
 */

export const REGISTRATION_GRADES = [
  { slug: "pre-school", name: "پیش‌دبستانی" },
  { slug: "grade-1", name: "پایه اول" },
  { slug: "grade-2", name: "پایه دوم" },
  { slug: "grade-3", name: "پایه سوم" },
  { slug: "grade-4", name: "پایه چهارم" },
  { slug: "grade-5", name: "پایه پنجم" },
  { slug: "grade-6", name: "پایه ششم" },
  { slug: "grade-7", name: "پایه هفتم" },
  { slug: "grade-8", name: "پایه هشتم" },
  { slug: "grade-9", name: "پایه نهم" },
  { slug: "grade-10", name: "پایه دهم" },
  { slug: "grade-11", name: "پایه یازدهم" },
  { slug: "grade-12", name: "پایه دوازدهم" },
  { slug: "other", name: "سایر" },
] as const;

export const REGISTRATION_MAJORS = [
  { slug: "math", name: "ریاضی" },
  { slug: "experimental", name: "تجربی" },
  { slug: "humanities", name: "انسانی" },
  { slug: "technical", name: "فنی" },
  { slug: "other", name: "سایر" },
] as const;

const MAJOR_REQUIRED_GRADE_SLUGS = new Set([
  "grade-10",
  "grade-11",
  "grade-12",
]);

export function registrationGradeRequiresMajor(slug: string): boolean {
  return MAJOR_REQUIRED_GRADE_SLUGS.has(slug);
}
