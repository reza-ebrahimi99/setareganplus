import { readFile } from "node:fs/promises";
import path from "node:path";
import { permOr403 } from "@/lib/auth";
import { uploadRoot, safeJoin, MIME } from "@/lib/uploads";

export async function GET(_req: Request, ctx: { params: Promise<{ key: string[] }> }) {
  const me = await permOr403("submissions");
  if (me instanceof Response) return me;
  const { key } = await ctx.params;
  const file = safeJoin(path.join(uploadRoot(), "private"), key);
  if (!file) return new Response("Not found", { status: 404 });
  try {
    const ext = path.extname(file).slice(1).toLowerCase();
    return new Response(new Uint8Array(await readFile(file)), { headers: { "Content-Type": MIME[ext] ?? "application/octet-stream", "Cache-Control": "private, no-store" } });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
