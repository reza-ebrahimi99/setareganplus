/**
 * Normalizes machine field keys for FormField.fieldKey.
 * Lowercase Latin letters, digits, hyphen, and underscore only.
 */

const FIELD_KEY_PATTERN = /^[a-z0-9]+(?:[_-][a-z0-9]+)*$/;

export type NormalizeFieldKeyResult =
  | { ok: true; fieldKey: string }
  | { ok: false; error: string };

export function normalizeFieldKey(raw: string): NormalizeFieldKeyResult {
  const fieldKey = raw.trim().toLowerCase();

  if (!fieldKey) {
    return { ok: false, error: "کلید فیلد الزامی است." };
  }

  if (!FIELD_KEY_PATTERN.test(fieldKey)) {
    return {
      ok: false,
      error:
        "کلید فیلد فقط می‌تواند حروف لاتین کوچک، عدد، خط تیره و زیرخط باشد (مثال: first_name).",
    };
  }

  if (fieldKey.length > 64) {
    return { ok: false, error: "کلید فیلد نباید بیشتر از ۶۴ کاراکتر باشد." };
  }

  return { ok: true, fieldKey };
}
