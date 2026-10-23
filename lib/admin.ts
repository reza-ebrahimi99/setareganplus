import "server-only";
import { saveImage } from "@/lib/uploads";

export const s = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
export const sn = (fd: FormData, k: string) => s(fd, k) || null;
export const b = (fd: FormData, k: string) => fd.get(k) === "on" || fd.get(k) === "true";
export const n = (fd: FormData, k: string) => Number.parseInt(s(fd, k), 10) || 0;

/** lines "a | b | c" -> string[][] */
export function rows(text: string, cols: number): string[][] {
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const parts = l.split("|").map((x) => x.trim());
      while (parts.length < cols) parts.push("");
      return parts.slice(0, cols - 1).concat(parts.slice(cols - 1).join(" | "));
    });
}
export const lines = (text: string) => text.split("\n").map((l) => l.trim()).filter(Boolean);

/** Handle an image input named `key` (+ `${key}_remove` checkbox). Returns new value. */
export async function imageField(fd: FormData, key: string, current: string | null, folder: string, width = 1600) {
  const f = fd.get(key);
  if (f instanceof File && f.size > 0) return saveImage(f, folder, width);
  if (b(fd, `${key}_remove`)) return null;
  return current;
}
