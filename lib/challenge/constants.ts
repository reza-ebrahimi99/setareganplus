export const CHALLENGE_GRADES = [
  { key: "7", label: "پایه هفتم", hasMajor: false },
  { key: "8", label: "پایه هشتم", hasMajor: false },
  { key: "9", label: "پایه نهم", hasMajor: false },
  { key: "10", label: "پایه دهم", hasMajor: true },
  { key: "11", label: "پایه یازدهم", hasMajor: true },
  { key: "12", label: "پایه دوازدهم", hasMajor: true },
] as const;

export const CHALLENGE_MAJORS = [
  { key: "math", label: "ریاضی و فیزیک" },
  { key: "science", label: "علوم تجربی" },
  { key: "humanities", label: "علوم انسانی" },
  { key: "vocational", label: "فنی‌وحرفه‌ای / کاردانش" },
] as const;

export const DEFAULT_CHALLENGE_SLUG = "math-five" as const;

export function getChallengeGrade(key: string) {
  return CHALLENGE_GRADES.find((grade) => grade.key === key) ?? null;
}

export function getChallengeMajor(key: string) {
  return CHALLENGE_MAJORS.find((major) => major.key === key) ?? null;
}

export function audienceKey(gradeKey: string, majorKey?: string | null): string {
  return `${gradeKey}:${majorKey || "all"}`;
}

export function validateChallengeAudience(
  gradeKey: string,
  majorKey?: string | null,
):
  | { ok: true; gradeKey: string; gradeLabel: string; majorKey: string | null; majorLabel: string | null }
  | { ok: false; error: string } {
  const grade = getChallengeGrade(gradeKey.trim());
  if (!grade) return { ok: false, error: "پایه تحصیلی معتبر نیست." };

  if (!grade.hasMajor) {
    return {
      ok: true,
      gradeKey: grade.key,
      gradeLabel: grade.label,
      majorKey: null,
      majorLabel: null,
    };
  }

  const major = getChallengeMajor((majorKey ?? "").trim());
  if (!major) return { ok: false, error: "رشته تحصیلی را انتخاب کنید." };
  return {
    ok: true,
    gradeKey: grade.key,
    gradeLabel: grade.label,
    majorKey: major.key,
    majorLabel: major.label,
  };
}

