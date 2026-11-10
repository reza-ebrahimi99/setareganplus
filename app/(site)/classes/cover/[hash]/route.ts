import { readPoster } from "@/lib/classes/poster";

export const dynamic = "force-dynamic";

const PLACEHOLDER = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#0a1a3f"/><stop offset="1" stop-color="#2f5bea"/></linearGradient></defs><rect width="1280" height="720" fill="url(#g)"/><polygon points="560,250 560,470 760,360" fill="#f4b21b"/></svg>`;

export async function GET(_req: Request, ctx: { params: Promise<{ hash: string }> }) {
  const { hash } = await ctx.params;
  const file = await readPoster(hash).catch(() => null);
  if (!file) {
    return new Response(PLACEHOLDER, { headers: { "Content-Type": "image/svg+xml", "Cache-Control": "public, max-age=300" } });
  }
  return new Response(new Uint8Array(file.body), { headers: { "Content-Type": file.type, "Cache-Control": "public, max-age=86400" } });
}
