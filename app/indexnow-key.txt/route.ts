import { getIndexNowKey } from "@/lib/indexnow";

export const dynamic = "force-dynamic";

export async function GET() {
  return new Response(await getIndexNowKey(), { headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=3600" } });
}
