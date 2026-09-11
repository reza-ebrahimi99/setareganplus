/**
 * Overlay approved GUIDANCE_V2_PACKAGES onto the pre-deploy production
 * step10-packages.ts so alumni/payment helpers keep their original signatures.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";

const dest = process.argv[2];
const catalogSrc = process.argv[3];
const backupSrc = process.argv[4] || "";

if (!dest || !catalogSrc) {
  console.error("usage: merge-step10-packages.mjs DEST CATALOG_SRC [BACKUP_SRC]");
  process.exit(1);
}

const catalogFile = readFileSync(catalogSrc, "utf8");
let destFile = existsSync(dest) ? readFileSync(dest, "utf8") : catalogFile;

const catalogBlock = extractConst(catalogFile, "GUIDANCE_V2_PACKAGES");
if (!catalogBlock) {
  console.error("catalog file missing GUIDANCE_V2_PACKAGES");
  process.exit(1);
}

if (extractConst(destFile, "GUIDANCE_V2_PACKAGES")) {
  destFile = replaceConst(destFile, "GUIDANCE_V2_PACKAGES", catalogBlock);
} else {
  destFile = catalogFile;
}

if (backupSrc && existsSync(backupSrc)) {
  const backup = readFileSync(backupSrc, "utf8");
  const alumni = extractConst(backup, "GUIDANCE_V2_ALUMNI_DISCOUNT_RIALS");
  const calc = extractFunction(backup, "calculateGuidanceV2PackagePrice");
  if (alumni) {
    destFile = extractConst(destFile, "GUIDANCE_V2_ALUMNI_DISCOUNT_RIALS")
      ? replaceConst(destFile, "GUIDANCE_V2_ALUMNI_DISCOUNT_RIALS", alumni)
      : destFile + "\n\n" + alumni + "\n";
  }
  if (calc) {
    destFile = extractFunction(destFile, "calculateGuidanceV2PackagePrice")
      ? replaceFunction(destFile, "calculateGuidanceV2PackagePrice", calc)
      : destFile + "\n\n" + calc + "\n";
  }
  if (!alumni || !calc) {
    console.error("backup is missing required exports");
    process.exit(1);
  }
}

writeFileSync(dest, destFile, "utf8");
console.log("merged step10-packages.ts");

function extractConst(src, name) {
  const start = src.indexOf(`export const ${name}`);
  if (start < 0) return null;
  const slice = src.slice(start);
  const end = slice.search(/;\r?\n/);
  if (end < 0) return null;
  return slice.slice(0, end + 1).trim();
}

function replaceConst(src, name, next) {
  const current = extractConst(src, name);
  if (!current) return src;
  return src.replace(current, next);
}

function extractFunction(src, name) {
  const start = src.indexOf(`export function ${name}`);
  if (start < 0) return null;
  const slice = src.slice(start);
  const nextExport = slice.slice(1).search(/\nexport /);
  return (nextExport < 0 ? slice : slice.slice(0, nextExport + 1)).trim();
}

function replaceFunction(src, name, next) {
  const current = extractFunction(src, name);
  if (!current) return src;
  return src.replace(current, next);
}
