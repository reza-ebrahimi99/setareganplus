import type { EducationNormalizeResult } from "@/lib/atrin/education/types";

const PERSIAN_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
const ARABIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";

const SUPER_MAP: Record<string, string> = {
  "⁰": "0",
  "¹": "1",
  "²": "2",
  "³": "3",
  "⁴": "4",
  "⁵": "5",
  "⁶": "6",
  "⁷": "7",
  "⁸": "8",
  "⁹": "9",
  "⁺": "+",
  "⁻": "-",
};

const SUB_MAP: Record<string, string> = {
  "₀": "0",
  "₁": "1",
  "₂": "2",
  "₃": "3",
  "₄": "4",
  "₅": "5",
  "₆": "6",
  "₇": "7",
  "₈": "8",
  "₉": "9",
};

const FRACTION_MAP: Record<string, string> = {
  "½": "1/2",
  "⅓": "1/3",
  "⅔": "2/3",
  "¼": "1/4",
  "¾": "3/4",
  "⅕": "1/5",
  "⅖": "2/5",
  "⅗": "3/5",
  "⅘": "4/5",
  "⅙": "1/6",
  "⅚": "5/6",
  "⅛": "1/8",
  "⅜": "3/8",
  "⅝": "5/8",
  "⅞": "7/8",
};

/**
 * Education Normalizer — keeps original, returns normalized copy.
 */
export function normalizeEducationInput(original: string): EducationNormalizeResult {
  let normalized = original
    .replace(/ي/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/[\u200c\u200f\u200e\u200d]/g, " ");

  normalized = normalized.replace(/[۰-۹]/g, (d) =>
    String(PERSIAN_DIGITS.indexOf(d)),
  );
  normalized = normalized.replace(/[٠-٩]/g, (d) =>
    String(ARABIC_DIGITS.indexOf(d)),
  );

  normalized = normalized.replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻]/g, (ch) => {
    const mapped = SUPER_MAP[ch];
    return mapped !== undefined ? `^${mapped}` : ch;
  });

  normalized = normalized.replace(/[₀₁₂₃₄₅₆₇₈₉]/g, (ch) => SUB_MAP[ch] ?? ch);

  normalized = normalized.replace(
    /[½⅓⅔¼¾⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞]/g,
    (ch) => FRACTION_MAP[ch] ?? ch,
  );

  // Operators & Persian math words
  normalized = normalized
    .replace(/÷|تقسیم\s*بر|تقسیم/gi, "/")
    .replace(/×|∗|⋅|ضربدر|ضرب\s*در/gi, "*")
    .replace(/−|–|—/g, "-")
    .replace(/≤/g, "<=")
    .replace(/≥/g, ">=")
    .replace(/≠/g, "!=")
    .replace(/√/g, "sqrt")
    .replace(/∞/g, "infinity")
    .replace(/π/gi, "pi")
    .replace(/°/g, " deg");

  // Collapse colon used as division in informal Persian math (a:b)
  normalized = normalized.replace(/(\d)\s*:\s*(\d)/g, "$1/$2");

  // Whitespace
  normalized = normalized.replace(/\s+/g, " ").trim();

  return { original, normalized };
}
