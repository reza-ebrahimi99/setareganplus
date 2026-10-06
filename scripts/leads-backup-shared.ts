/**
 * Shared marker and safety checks for the one-off lead backup scripts.
 * The soft-delete script accepts only a workbook this export just wrote.
 */

import fs from "node:fs";
import path from "node:path";
import ExcelJS from "exceljs";

export const EXPORT_KIND = "leads-full-export";
export const MANIFEST_SHEET = "فهرست";
export const DEFAULT_BACKUP_DIR = "/var/backups/setareganplus";
export const MAX_BACKUP_AGE_MS = 24 * 60 * 60 * 1000;

const WEB_ROOT = "/var/www";

export type SheetCount = {
  sheetKey: string;
  sheetName: string;
  rows: number;
  countStar: number | null;
  match: "yes" | "derived";
};

export function personName(
  firstName: string | null | undefined,
  lastName: string | null | undefined,
): string {
  return `${firstName ?? ""} ${lastName ?? ""}`.replace(/\s+/g, " ").trim();
}

export function iso(value: Date | null | undefined): string {
  if (!value) return "";
  return value.toISOString();
}

export function clip(value: string, max = 32_000): string {
  if (value.length <= max) return value;
  return `${value.slice(0, max)}…[truncated]`;
}

export function jsonCell(value: unknown): string {
  if (value == null) return "";
  try {
    return clip(JSON.stringify(value));
  } catch {
    return "";
  }
}

export function likelyTestReason(firstName: string, lastName: string): string | null {
  const name = personName(firstName, lastName);
  if (!name) return "نام خالی";
  const reasons: string[] = [];
  if (/(تست|آزمایش|test|demo|sample|نمونه|asdf|qwerty)/i.test(name)) {
    reasons.push("نام شبیه داده آزمایشی است");
  }
  if (/[0-9۰-۹]/.test(name)) {
    reasons.push("عدد در نام");
  }
  const compact = name.replace(/\s/g, "");
  if (/(.)\1{3,}/u.test(compact)) {
    reasons.push("تکرار غیرعادی حرف");
  }
  const hasPersian = /[\u0600-\u06FF]/.test(compact);
  if (compact.length > 0 && compact.length <= 1) {
    reasons.push("نام خیلی کوتاه");
  } else if (!hasPersian && compact.length > 0 && compact.length <= 2) {
    reasons.push("نام خیلی کوتاه و بدون حرف فارسی");
  }
  return reasons.length > 0 ? reasons.join("؛ ") : null;
}

export function parseArgs(argv: string[]): {
  flags: Set<string>;
  values: Map<string, string>;
} {
  const flags = new Set<string>();
  const values = new Map<string, string>();
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index] ?? "";
    if (!arg.startsWith("--") || arg.length < 3) {
      throw new Error(`نشانه نامعتبر: ${arg}`);
    }
    const key = arg.slice(2);
    const next = argv[index + 1];
    if (next && !next.startsWith("--")) {
      values.set(key, next);
      index += 1;
    } else {
      flags.add(key);
    }
  }
  return { flags, values };
}

export function assertKnownArgs(
  parsed: { flags: Set<string>; values: Map<string, string> },
  allowed: readonly string[],
): void {
  const known = new Set(allowed);
  for (const key of parsed.flags) {
    if (!known.has(key)) throw new Error(`نشانه ناشناخته: --${key}`);
  }
  for (const key of parsed.values.keys()) {
    if (!known.has(key)) throw new Error(`نشانه ناشناخته: --${key}`);
  }
}

export function defaultExportPath(now = new Date()): string {
  const stamp = now.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  return path.join(DEFAULT_BACKUP_DIR, `leads-full-${stamp}.xlsx`);
}

export function assertOutsideWebRoot(filePath: string): string {
  const resolved = path.resolve(filePath);
  if (resolved === WEB_ROOT || resolved.startsWith(`${WEB_ROOT}${path.sep}`)) {
    throw new Error("نوشتن پشتیبان داخل /var/www مجاز نیست.");
  }
  const publicDir = path.resolve(process.cwd(), "public");
  if (resolved === publicDir || resolved.startsWith(`${publicDir}${path.sep}`)) {
    throw new Error("نوشتن پشتیبان داخل پوشه public مجاز نیست.");
  }
  if (!resolved.endsWith(".xlsx")) {
    throw new Error("مسیر خروجی باید به xlsx ختم شود.");
  }
  return resolved;
}

export function writeSecureFile(filePath: string, body: Buffer): string {
  const resolved = assertOutsideWebRoot(filePath);
  const directory = path.dirname(resolved);
  const directoryExisted = fs.existsSync(directory);
  fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
  if (!directoryExisted) fs.chmodSync(directory, 0o700);
  const partial = path.join(directory, `.${path.basename(resolved)}.${process.pid}.partial`);
  const fd = fs.openSync(partial, "w", 0o600);
  try {
    fs.writeFileSync(fd, body);
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
  fs.chmodSync(partial, 0o600);
  fs.renameSync(partial, resolved);
  fs.chmodSync(resolved, 0o600);
  return resolved;
}

function cellText(value: ExcelJS.CellValue): string {
  if (value == null) return "";
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (typeof value === "object" && "text" in value && typeof value.text === "string") {
    return value.text;
  }
  if (typeof value === "object" && "result" in value && value.result != null) {
    return cellText(value.result as ExcelJS.CellValue);
  }
  if (typeof value === "object" && "richText" in value && Array.isArray(value.richText)) {
    return value.richText.map((part) => part.text).join("");
  }
  return "";
}

export async function readLeadBackup(filePath: string): Promise<{ exportedAt: Date }> {
  const resolved = path.resolve(filePath);
  if (!fs.existsSync(resolved)) {
    throw new Error(`فایل پشتیبان پیدا نشد: ${resolved}`);
  }
  const stat = fs.statSync(resolved);
  if (!stat.isFile() || stat.size < 64) {
    throw new Error("فایل پشتیبان خالی یا نامعتبر است.");
  }
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(resolved);
  const sheet = workbook.getWorksheet(MANIFEST_SHEET);
  if (!sheet) {
    throw new Error("این فایل خروجی پشتیبان متقاضیان نیست.");
  }
  let kind = "";
  let exportedAtRaw = "";
  sheet.eachRow((row) => {
    const key = cellText(row.getCell(1).value).trim();
    const value = cellText(row.getCell(2).value).trim();
    if (key === "kind") kind = value;
    if (key === "exportedAt") exportedAtRaw = value;
  });
  if (kind !== EXPORT_KIND) {
    throw new Error("نوع فایل پشتیبان با خروجی این اسکریپت یکی نیست.");
  }
  const exportedAt = new Date(exportedAtRaw);
  if (Number.isNaN(exportedAt.getTime())) {
    throw new Error("زمان ثبت‌شده در فایل پشتیبان خوانده نشد.");
  }
  const ageMs = Date.now() - exportedAt.getTime();
  if (ageMs < -5 * 60 * 1000) {
    throw new Error("زمان فایل پشتیبان در آینده است.");
  }
  if (ageMs > MAX_BACKUP_AGE_MS) {
    throw new Error("فایل پشتیبان قدیمی‌تر از ۲۴ ساعت است. اول خروجی تازه بگیرید.");
  }
  return { exportedAt };
}

export async function resolveBackupPath(explicitPath?: string): Promise<string> {
  if (explicitPath) return path.resolve(explicitPath);
  if (!fs.existsSync(DEFAULT_BACKUP_DIR)) {
    throw new Error(
      `پوشه ${DEFAULT_BACKUP_DIR} نیست. مسیر فایل را با --backup بدهید.`,
    );
  }
  const candidates = fs
    .readdirSync(DEFAULT_BACKUP_DIR)
    .filter((name) => name.startsWith("leads-full-") && name.endsWith(".xlsx"))
    .map((name) => path.join(DEFAULT_BACKUP_DIR, name))
    .sort((left, right) => fs.statSync(right).mtimeMs - fs.statSync(left).mtimeMs);
  let lastError = "فایل پشتیبان تازه‌ای در پوشه پیش‌فرض نیست.";
  for (const candidate of candidates) {
    try {
      await readLeadBackup(candidate);
      return candidate;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
  }
  throw new Error(lastError);
}
