import { randomBytes } from "node:crypto";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateGuidanceDiscountCode(prefix = ""): string {
  const cleanPrefix = prefix
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 8);
  const bytes = randomBytes(6);
  let body = "";
  for (const byte of bytes) {
    body += ALPHABET[byte % ALPHABET.length];
  }
  return `${cleanPrefix}${body}`;
}

export function generateUniqueGuidanceDiscountCodes(params: {
  count: number;
  prefix?: string;
  existing: Set<string>;
}): string[] {
  const count = Math.min(100, Math.max(1, Math.floor(params.count)));
  const existing = new Set(
    [...params.existing].map((code) => code.trim().toUpperCase()),
  );
  const created: string[] = [];
  for (let attempt = 0; attempt < count * 20 && created.length < count; attempt += 1) {
    const next = generateGuidanceDiscountCode(params.prefix);
    if (existing.has(next)) continue;
    existing.add(next);
    created.push(next);
  }
  if (created.length < count) {
    throw new Error("تولید کد یکتا ممکن نشد. دوباره تلاش کنید.");
  }
  return created;
}
