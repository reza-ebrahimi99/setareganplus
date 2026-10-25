/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePerm } from "@/lib/auth";
import { fa, jalaliDate } from "@/lib/format";
import { NEWS_CATEGORIES, NEWS_CAT_LABEL } from "@/lib/news";
import { PageTitle, Flash, Empty } from "@/components/admin/ui";

export const metadata = { title: "اخبار و اطلاعیه‌ها" };

export default async function NewsList({ searchParams }: { searchParams: Promise<{ ok?: string; cat?: string; st?: string }> }) {
  await requirePerm("content.news");
  const { ok, cat, st } = await searchParams;
  const now = new Date();
  const where = {
    ...(cat ? { category: cat } : {}),
    ...(st === "draft" ? { published: false } : st === "live" ? { published: true } : {}),
  };
  const [items, total] = await Promise.all([
    prisma.news.findMany({ where, orderBy: [{ pinned: "desc" }, { publishedAt: { sort: "desc", nulls: "first" } }, { createdAt: "desc" }] }),
    prisma.news.count(),
  ]);
  const chip = (href: string, label: string, on: boolean) => (
    <Link href={href} className={`chip ${on ? "bg-navy text-white" : "bg-paper text-muted ring-1 ring-line hover:text-navy"}`}>{label}</Link>
  );
  return (
    <>
      <PageTitle title="اخبار و اطلاعیه‌ها" sub={`${fa(total)} مطلب`} action={<Link href="/admin/news/new" className="btn-gold px-5 py-2.5 text-sm">+ خبر / اطلاعیه جدید</Link>} />
      <Flash ok={ok} />
      <div className="mb-4 flex flex-wrap gap-2">
        {chip("/admin/news", "همه", !cat && !st)}
        {chip("/admin/news?st=live", "منتشرشده", st === "live")}
        {chip("/admin/news?st=draft", "پیش‌نویس", st === "draft")}
        <span className="mx-1 w-px bg-line" />
        {NEWS_CATEGORIES.map((c) => chip(`/admin/news?cat=${c.key}`, c.label, cat === c.key))}
      </div>
      {items.length === 0 ? (
        <Empty>هنوز خبری ثبت نشده است. اولین اطلاعیه را بنویسید؛ پس از انتشار در صفحهٔ اصلی و صفحهٔ «اخبار» دیده می‌شود.</Empty>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-line bg-paper">
          <table className="w-full text-sm">
            <thead className="bg-ivory text-right text-xs text-muted">
              <tr><th className="p-3 font-semibold">عنوان</th><th className="hidden p-3 font-semibold md:table-cell">دسته</th><th className="hidden p-3 font-semibold sm:table-cell">تاریخ انتشار</th><th className="p-3 font-semibold">وضعیت</th><th className="p-3" /></tr>
            </thead>
            <tbody className="divide-y divide-line">
              {items.map((x) => {
                const scheduled = x.published && x.publishedAt && x.publishedAt > now;
                return (
                  <tr key={x.id} className="hover:bg-ivory/60">
                    <td className="p-3">
                      <div className="flex items-center gap-3">
                        <div className="size-11 shrink-0 overflow-hidden rounded-xl bg-ivory">{x.cover && <img src={x.cover} alt="" className="size-full object-cover" />}</div>
                        <div className="min-w-0"><p className="truncate font-bold text-navy">{x.pinned && <span title="سنجاق‌شده">📌 </span>}{x.title}</p>{x.summary && <p className="truncate text-xs text-muted">{x.summary}</p>}</div>
                      </div>
                    </td>
                    <td className="hidden p-3 text-muted md:table-cell">{NEWS_CAT_LABEL[x.category] ?? x.category}</td>
                    <td className="hidden p-3 text-muted sm:table-cell">{x.publishedAt ? jalaliDate(x.publishedAt) : "—"}</td>
                    <td className="p-3">
                      <span className={`chip ${scheduled ? "bg-gold/20 text-gold-ink" : x.published ? "bg-emerald-50 text-emerald-700" : "bg-line text-muted"}`}>{scheduled ? "زمان‌بندی‌شده" : x.published ? "منتشرشده" : "پیش‌نویس"}</span>
                    </td>
                    <td className="p-3 text-left whitespace-nowrap">
                      {x.published && !scheduled && <Link href={`/news/${x.slug}`} target="_blank" className="ml-3 text-xs text-muted hover:text-navy">مشاهده</Link>}
                      <Link href={`/admin/news/${x.id}`} className="font-bold text-edu">ویرایش</Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
