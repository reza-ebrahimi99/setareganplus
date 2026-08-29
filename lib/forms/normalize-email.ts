export type NormalizeEmailResult =
  | { ok: true; email: string }
  | { ok: false; error: string };

/** Conservative email check — not a full RFC parser. */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(rawInput: string): NormalizeEmailResult {
  const email = rawInput.trim().toLowerCase();

  if (!email) {
    return { ok: false, error: "ایمیل الزامی است." };
  }

  if (email.length > 320) {
    return { ok: false, error: "ایمیل نباید بیشتر از ۳۲۰ کاراکتر باشد." };
  }

  if (!EMAIL_PATTERN.test(email)) {
    return { ok: false, error: "ایمیل واردشده معتبر نیست." };
  }

  return { ok: true, email };
}
