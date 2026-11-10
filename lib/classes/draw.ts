import { createHmac, timingSafeEqual } from "node:crypto";

export type DrawPayload = { kind: "lesson" | "practice"; ref: string; ids: string[]; exp: number };

export function signDraw(payload: DrawPayload, secret: string) {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = createHmac("sha256", secret).update(`class-draw:v1:${body}`).digest("base64url");
  return `${body}.${sig}`;
}

export function readDraw(token: string, secret: string): DrawPayload | null {
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = createHmac("sha256", secret).update(`class-draw:v1:${body}`).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(body, "base64url").toString()) as DrawPayload;
    if (!parsed || !Array.isArray(parsed.ids) || parsed.ids.length < 1 || parsed.ids.length > 20) return null;
    if (typeof parsed.exp !== "number" || parsed.exp < Date.now()) return null;
    if (parsed.kind !== "lesson" && parsed.kind !== "practice") return null;
    if (typeof parsed.ref !== "string") return null;
    return parsed;
  } catch {
    return null;
  }
}
