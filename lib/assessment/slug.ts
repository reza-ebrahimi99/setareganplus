export function normalizeAssessmentSlug(raw: string): string {
  const trimmed = raw.trim().toLowerCase();
  const latinized = trimmed
    .replace(/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/g, "-")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

  if (latinized.length >= 2) return latinized;
  return `assessment-${Date.now().toString(36)}`;
}

export function slugFromAssessmentTitle(title: string): string {
  return normalizeAssessmentSlug(title);
}
