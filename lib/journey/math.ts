/** Keep every formula one LTR island so Persian bidi cannot reorder it. */

const PERSIAN_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
const MATH_CHAR = /[A-Za-z0-9۰-۹+−–—×÷*/^=<>≤≥≠()²³-]/;

function toLatex(src: string) {
  return src
    .replace(/[۰-۹]/g, (d) => String(PERSIAN_DIGITS.indexOf(d)))
    .replace(/²/g, "^{2}")
    .replace(/³/g, "^{3}")
    .replace(/×/g, "\\times ")
    .replace(/÷/g, "\\div ")
    .replace(/≤/g, "\\le ")
    .replace(/≥/g, "\\ge ")
    .replace(/≠/g, "\\neq ")
    .replace(/[−–—]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

function wrapPlain(plain: string) {
  let out = "";
  let i = 0;
  while (i < plain.length) {
    if (!MATH_CHAR.test(plain[i] ?? "")) {
      out += plain[i];
      i += 1;
      continue;
    }
    let j = i;
    while (j < plain.length) {
      const ch = plain[j] ?? "";
      if (MATH_CHAR.test(ch)) {
        j += 1;
        continue;
      }
      if (ch === " " && MATH_CHAR.test(plain[j - 1] ?? "") && MATH_CHAR.test(plain[j + 1] ?? "")) {
        j += 1;
        continue;
      }
      break;
    }
    const chunk = plain.slice(i, j);
    out += /[A-Za-z0-9۰-۹]/.test(chunk) ? `$${toLatex(chunk)}$` : chunk;
    i = j;
  }
  return out;
}

/** Wrap bare numbers, variables, and operator chains. Existing $...$ nodes stay intact. */
export function wrapBareMath(text: string) {
  return text
    .split(/(\$\$[\s\S]+?\$\$|\$[^$\n]+\$)/g)
    .map((part) => (part.startsWith("$$") || (part.startsWith("$") && part.endsWith("$") && part.length > 1) ? part : wrapPlain(part)))
    .join("");
}

export function mathSegments(text: string) {
  return [...text.matchAll(/\$\$([\s\S]+?)\$\$|\$([^$\n]+)\$/g)].map((m) => (m[1] ?? m[2]).trim());
}

function foldMath(src: string) {
  return src
    .replace(/[۰-۹]/g, (d) => String(PERSIAN_DIGITS.indexOf(d)))
    .replace(/[−–—]/g, "-")
    .replace(/\s+/g, "")
    .toLowerCase();
}

/** Same formula (not a shared lone number) counts as one puzzle across a journey. */
export function twinKey(stem: string) {
  const rich = mathSegments(stem)
    .map(foldMath)
    .filter((m) => m.length >= 3 && /[+\-*/=<>^\\a-z]/.test(m));
  if (rich.length) return `m:${rich.join("~")}`;
  return `s:${foldMath(stem)}`;
}

/** Reasons a puzzle string would render as scrambled or split math. Empty means it is safe. */
export function bareMathIssues(text: string): string[] {
  const issues: string[] = [];
  const dollars = text.match(/\$/g)?.length ?? 0;
  if (dollars % 2 !== 0) issues.push("unbalanced-dollar");
  const plain = text.replace(/\$\$[\s\S]+?\$\$|\$[^$\n]+\$/g, "\u0000");
  if (plain.includes("$")) issues.push("stray-dollar");
  if (/[A-Za-z]/.test(plain)) issues.push("bare-latin");
  if (/[0-9]/.test(plain)) issues.push("bare-digit");
  if (/[۰-۹]/.test(plain)) issues.push("bare-persian-digit");
  if (/[+\-−–—×÷*/^=<>≤≥≠]/.test(plain)) issues.push("bare-operator");
  if (/\$[^$\n]+\$\s*[-+−–—×÷*/^=<>≤≥≠]\s*\$[^$\n]+\$/.test(text)) issues.push("split-formula");
  if (/\$[^$\n]+\$\s+\$[^$\n]+\$/.test(text)) issues.push("split-gap");
  if (/\$[^$\n]+\$\$[^$\n]+\$/.test(text)) issues.push("split-adjacent");
  return issues;
}
