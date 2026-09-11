import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const root = process.cwd();
const dest = join(root, "deploy/guidance-prelaunch-master-release/files");
const list = readFileSync(
  join(root, "deploy/guidance-prelaunch-master-release/COPY_FILES.txt"),
  "utf8",
)
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter(Boolean);

for (const rel of list) {
  if (rel.includes("page.early.tsx") || rel.includes("middleware.ts") || rel.includes("zibal")) {
    throw new Error(`refusing to pack protected path: ${rel}`);
  }
  const from = join(root, rel);
  const to = join(dest, rel);
  mkdirSync(dirname(to), { recursive: true });
  copyFileSync(from, to);
}

const css = readFileSync(join(root, "app/globals.css"), "utf8");
const start = "/* ===== GUIDANCE PRELAUNCH MASTER ===== */";
const end = "/* ===== END GUIDANCE PRELAUNCH MASTER ===== */";
const from = css.indexOf(start);
const to = css.indexOf(end);
if (from < 0 || to < 0) throw new Error("CSS markers missing");
writeFileSync(
  join(root, "deploy/guidance-prelaunch-master-release/guidance-prelaunch-master.css"),
  css.slice(from, to + end.length),
  "utf8",
);

console.log(`packed ${list.length} files`);
