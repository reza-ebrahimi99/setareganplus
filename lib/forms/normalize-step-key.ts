/**
 * Normalizes machine step keys for FormStep.stepKey.
 * Lowercase Latin letters, digits, hyphen, and underscore only.
 */

const STEP_KEY_PATTERN = /^[a-z0-9]+(?:[_-][a-z0-9]+)*$/;

export type NormalizeStepKeyResult =
  | { ok: true; stepKey: string }
  | { ok: false; error: string };

export function normalizeStepKey(raw: string): NormalizeStepKeyResult {
  const stepKey = raw.trim().toLowerCase();

  if (!stepKey) {
    return { ok: false, error: "کلید مرحله الزامی است." };
  }

  if (!STEP_KEY_PATTERN.test(stepKey)) {
    return {
      ok: false,
      error:
        "کلید مرحله فقط می‌تواند حروف لاتین کوچک، عدد، خط تیره و زیرخط باشد (مثال: student_info).",
    };
  }

  if (stepKey.length > 64) {
    return { ok: false, error: "کلید مرحله نباید بیشتر از ۶۴ کاراکتر باشد." };
  }

  return { ok: true, stepKey };
}

/** Builds a stable unused step key like step-1, step-2, … */
export function nextAvailableStepKey(existingKeys: ReadonlySet<string>): string {
  let index = 1;
  while (existingKeys.has(`step-${index}`)) {
    index += 1;
  }
  return `step-${index}`;
}
