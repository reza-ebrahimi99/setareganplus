import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { uploadRoot, safeJoin, MIME } from "@/lib/uploads";

export async function GET(_req: Request, ctx: { params: Promise<{ path: string[] }> }) {
  const { path: parts } = await ctx.params;
  const base = path.join(uploadRoot(), "public");
  const file = safeJoin(base, parts);
  if (!file) return new Response("Not found", { status: 404 });
  try {
    const st = await stat(file);
    if (!st.isFile()) throw new Error();
    const ext = path.extname(file).slice(1).toLowerCase();
    return new Response(new Uint8Array(await readFile(file)), {
      headers: {
        "Content-Type": MIME[ext] ?? "application/octet-stream",
        "Cache-Control": "public, max-age=31536000, immutable",
        "Content-Length": String(st.size),
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
