import { readFileSync, statSync, existsSync, readdirSync } from "node:fs";
import { join, relative, posix, sep } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = "D:\\projects\\setareganplus";
const bundle = join(root, "deploy", "guidance-dashboard-restore");
const archive = join(root, "deploy", "guidance-dashboard-restore.tar.gz");
const filesDir = join(bundle, "files");

function pythonRepr(s) {
  let out = "'";
  for (const ch of s) {
    const c = ch.codePointAt(0);
    if (ch === "'") out += "\\'";
    else if (ch === "\\") out += "\\\\";
    else if (ch === "\n") out += "\\n";
    else if (ch === "\r") out += "\\r";
    else if (ch === "\t") out += "\\t";
    else if (c < 32) out += "\\x" + c.toString(16).padStart(2, "0");
    else out += ch;
  }
  return out + "'";
}

function walkFiles(dir) {
  const out = [];
  for (const name of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, name.name);
    if (name.isDirectory()) out.push(...walkFiles(p));
    else if (name.isFile()) out.push(p);
  }
  return out;
}

function relWin(from, p) {
  return relative(from, p);
}

console.log("=== BUNDLE TREE ===");
const bundleFiles = walkFiles(bundle).sort((a, b) => a.localeCompare(b));
for (const p of bundleFiles) {
  const data = readFileSync(p);
  const crlf = data.includes(Buffer.from("\r\n"));
  let cr = 0;
  for (const b of data) if (b === 0x0d) cr += 1;
  console.log(`${relWin(bundle, p)}  bytes=${statSync(p).size}  crlf=${crlf ? "True" : "False"}  cr_count=${cr}`);
}

console.log("=== COPY_FILES.txt repr ===");
console.log(pythonRepr(readFileSync(join(bundle, "COPY_FILES.txt"), "utf-8")));

console.log("=== PACKED APP FILES ===");
const packed = walkFiles(filesDir).sort((a, b) => a.localeCompare(b));
for (const p of packed) {
  const rel = relative(filesDir, p).split(sep).join("/");
  console.log(rel);
}

console.log("=== TAR NAMES ===");
if (existsSync(archive)) {
  const st = statSync(archive);
  console.log("archive", archive, "size", st.size);
  const tarCmd = spawnSync("tar", ["-tzf", archive], { encoding: "utf-8" });
  const names = (tarCmd.stdout || "")
    .split(/\r?\n/)
    .map((n) => n.replace(/\\/g, "/").replace(/\/$/, ""))
    .filter(Boolean);
  if (tarCmd.status !== 0) {
    console.log("tar_list_error", tarCmd.status, tarCmd.stderr);
  }
  for (const n of names) console.log(n);
  const roots = [...new Set(names.filter(Boolean).map((n) => n.split("/")[0]))].sort();
  console.log("EXTRACT_ROOTS", roots);
} else {
  console.log("ARCHIVE MISSING");
}

const sh = join(bundle, "apply-production.sh");
console.log("=== BASH -n ===");
const bashCandidates = [
  "bash",
  "C:\\Program Files\\Git\\usr\\bin\\bash.exe",
  "C:\\Program Files\\Git\\bin\\bash.exe",
];
let bashRan = false;
for (const bash of bashCandidates) {
  const r = spawnSync(bash, ["-n", sh], { encoding: "utf-8" });
  if (r.error && bash !== bashCandidates[bashCandidates.length - 1]) continue;
  if (r.error) {
    console.log("bash_unavailable", r.error);
  } else {
    console.log("exit", r.status);
    console.log(r.stdout || "");
    console.log(r.stderr || "");
  }
  bashRan = true;
  break;
}
if (!bashRan) console.log("bash_unavailable", "no bash candidate");

console.log("=== APPLY SCRIPT CHECKS ===");
const text = readFileSync(sh, "utf-8");
const needles = [
  "prisma migrate",
  "schema.prisma",
  "zibal",
  "middleware",
  ".env",
  "nginx",
  "ecosystem",
  "page.early",
  "pm2 restart",
  "tsc --noEmit",
  "npm run build",
  "NODE_OPTIONS",
  "backup_file",
  "setareganplus",
];
for (const needle of needles) {
  const hit = text.includes(needle) || text.toLowerCase().includes(needle.toLowerCase());
  console.log(needle, "->", hit ? "True" : "False");
}

console.log("=== NOTE ===");
console.log("python_unavailable; node equivalent used");
