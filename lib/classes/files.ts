import "server-only";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { uploadRoot } from "@/lib/uploads";

export async function saveClassPdf(file: File) {
  if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) throw new Error("فقط فایل PDF مجاز است.");
  if (file.size <= 0 || file.size > 30 * 1024 * 1024) throw new Error("حجم فایل باید بین ۱ بایت و ۳۰ مگابایت باشد.");
  const sub = new Date().toISOString().slice(0, 7);
  const dir = path.join(uploadRoot(), "private", "classes", sub);
  await mkdir(dir, { recursive: true });
  const name = `${Date.now().toString(36)}-${randomBytes(6).toString("hex")}.pdf`;
  await writeFile(path.join(dir, name), Buffer.from(await file.arrayBuffer()));
  return { key: `classes/${sub}/${name}`, name: file.name.replace(/[^\w.\-\u0600-\u06FF ]+/g, "").slice(0, 80) || "file.pdf", bytes: file.size };
}
