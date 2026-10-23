import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { fa, jalaliDateTime } from "@/lib/format";
import { displayValue } from "@/lib/forms/validate";
import { PageTitle, Panel, STATUS, Empty } from "@/components/admin/ui";

export default async function Dashboard() {
  const [newCount, total, week, forms, team, ach, photos, latest] = await Promise.all([
    prisma.submission.count({ where: { status: "NEW" } }),
    prisma.submission.count(),
    prisma.submission.count({ where: { createdAt: { gte: new Date(Date.now() - 7 * 864e5) } } }),
    prisma.form.count({ where: { status: "PUBLISHED" } }),
    prisma.teamMember.count(),
    prisma.achievement.count(),
    prisma.galleryPhoto.count(),
    prisma.submission.findMany({ orderBy: { createdAt: "desc" }, take: 8, include: { form: { select: { title: true, id: true } } } }),
  ]);
  const cards = [
    { label: "درخواست جدید", value: newCount, href: "/admin/submissions?status=NEW", accent: true },
    { label: "درخواست‌های ۷ روز اخیر", value: week, href: "/admin/submissions" },
    { label: "کل درخواست‌ها", value: total, href: "/admin/submissions" },
    { label: "فرم‌های فعال", value: forms, href: "/admin/forms" },
  ];
  return (
    <>
      <PageTitle title="داشبورد" sub="خلاصه وضعیت سایت و درخواست‌ها" action={<Link href="/admin/forms" className="btn-ghost px-4 py-2 text-sm">فرم‌ساز</Link>} />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cards.map((c) => (
          <Link key={c.label} href={c.href} className={`rounded-2xl border p-5 transition-colors ${c.accent ? "border-gold/40 bg-gold/10 hover:bg-gold/15" : "border-line bg-paper hover:border-navy/20"}`}>
            <p className="text-sm text-muted">{c.label}</p>
            <p className="mt-1 text-3xl font-extrabold text-navy">{fa(c.value)}</p>
          </Link>
        ))}
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <Panel title="آخرین درخواست‌ها">
          {latest.length === 0 ? (
            <Empty>هنوز درخواستی ثبت نشده است.</Empty>
          ) : (
            <ul className="divide-y divide-line">
              {latest.map((x) => {
                const d = x.data as Record<string, unknown>;
                const vals = Object.values(d).filter((v) => typeof v === "string").slice(0, 3) as string[];
                return (
                  <li key={x.id} className="flex items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{vals.map(displayValue).join(" · ")}</p>
                      <p className="text-xs text-muted">{x.form.title} · {jalaliDateTime(x.createdAt)}</p>
                    </div>
                    <span className={`chip shrink-0 ${STATUS[x.status].cls}`}>{STATUS[x.status].label}</span>
                  </li>
                );
              })}
            </ul>
          )}
          <Link href="/admin/submissions" className="mt-4 inline-block text-sm font-bold text-edu">همه درخواست‌ها ←</Link>
        </Panel>
        <Panel title="محتوای سایت">
          <ul className="space-y-3 text-sm">
            {[
              ["اعضای تیم", team, "/admin/team"],
              ["افتخارات", ach, "/admin/achievements"],
              ["تصاویر گالری", photos, "/admin/gallery"],
            ].map(([l, v, h]) => (
              <li key={String(l)} className="flex items-center justify-between rounded-xl bg-ivory px-4 py-3">
                <Link href={String(h)} className="font-semibold hover:text-edu">{l}</Link>
                <span className="font-extrabold text-navy">{fa(Number(v))}</span>
              </li>
            ))}
          </ul>
          <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
            <Link href="/admin/centers/education" className="rounded-xl border border-edu/30 bg-edu-soft px-3 py-2.5 font-semibold text-edu">آموزشگاه ستارگان</Link>
            <Link href="/admin/centers/ghalamchi" className="rounded-xl border border-gc/30 bg-gc-soft px-3 py-2.5 font-semibold text-gc">قلم‌چی نسیم‌شهر</Link>
          </div>
        </Panel>
      </div>
    </>
  );
}
