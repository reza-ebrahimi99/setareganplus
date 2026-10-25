import { prisma } from "@/lib/prisma";
import { liveWhere, NEWS_CAT_LABEL } from "@/lib/news";
import { jalaliDate } from "@/lib/format";
import { ogCard } from "@/lib/og/card";

/** Share card for one news item: /og/news/<slug> (stable URL, used in og:image and JSON-LD). */
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const n = await prisma.news.findFirst({ where: liveWhere({ slug: decodeURIComponent((await params).slug) }) });
  if (!n) return new Response("not found", { status: 404 });
  const img = await ogCard({
    kicker: NEWS_CAT_LABEL[n.category] ?? "خبر",
    title: n.title,
    foot: n.publishedAt ? `اخبار و اطلاعیه‌ها · ${jalaliDate(n.publishedAt)}` : "اخبار و اطلاعیه‌ها",
  });
  img.headers.set("cache-control", "public, max-age=3600, s-maxage=86400");
  return img;
}
