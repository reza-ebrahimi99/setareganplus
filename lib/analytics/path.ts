/** Public path normalization. Safe to import from client components (no Node builtins). */

const BLOCKED = ["/admin", "/api", "/order", "/booklet", "/payments", "/media", "/img", "/_next", "/shop/pay", "/f/r", "/f/pay"];

/** Path we are willing to store: no query, no token routes, no file extensions. */
export function normalizePublicPath(input: string | null | undefined): string | null {
  if (!input || typeof input !== "string") return null;
  let raw = input.trim();
  if (!raw.startsWith("/") || raw.startsWith("//")) return null;
  raw = raw.split("#")[0]?.split("?")[0] ?? "";
  if (!raw.startsWith("/")) return null;
  try {
    raw = decodeURIComponent(raw);
  } catch {
    return null;
  }
  raw = raw.replace(/\/+/g, "/");
  if (raw.length > 1 && raw.endsWith("/")) raw = raw.slice(0, -1);
  if (!raw || raw.length > 180) return null;
  if (raw.includes("..") || raw.includes("\\") || raw.includes("\0") || raw.includes("%")) return null;
  if (/\.[a-z0-9]{2,8}$/i.test(raw)) return null;
  const lower = raw.toLowerCase();
  if (BLOCKED.some((p) => lower === p || lower.startsWith(p + "/"))) return null;
  if (lower === "/o" || lower.startsWith("/o/")) return null;
  if (!/^\/[\p{L}\p{N}/_.\-]*$/u.test(raw)) return null;
  return raw;
}
