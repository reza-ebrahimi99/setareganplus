/**
 * ASCII-safe registration flow slugs — unique per organization.
 */

export function normalizeRegistrationFlowSlug(raw: string): string {
  const trimmed = raw.trim().toLowerCase();
  const latinized = trimmed
    .replace(/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/g, "-")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

  if (latinized.length >= 2) {
    return latinized;
  }

  return `flow-${Date.now().toString(36)}`;
}

export function slugFromRegistrationFlowTitle(title: string): string {
  return normalizeRegistrationFlowSlug(title);
}
