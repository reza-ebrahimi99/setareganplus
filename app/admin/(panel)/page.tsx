import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { fa, jalaliDateTime } from "@/lib/format";
import { displayValue } from "@/lib/forms/validate";
import { PageTitle, Panel, STATUS, Empty } from "@/components/admin/ui";
import { requireAdmin, can, type AdminUser } from "@/lib/auth";
import { ROUTE_PERM, PERM_LABEL } from "@/lib/perms";

export default async function Dashboard() {
  const me = await requireAdmin();
  if (!can(me, "submissions")) return <StaffHome me={me} />;
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

const HOME_LINKS: { href: string; label: string; desc: string }[] = [
  { href: "/admin/shop/pickup", label: "تحویل حضوری", desc: "اسکن کد رسید و ثبت تحویل جزوه" },
  { href: "/admin/shop/orders", label: "سفارش‌ها", desc: "فهرست و جزئیات سفارش‌های جزوه" },
  { href: "/admin/shop", label: "داشبورد فروش", desc: "آمار و گزارش فروش" },
  { href: "/admin/shop/products", label: "جزوه‌ها", desc: "جزوه‌ها، قیمت و موجودی" },
  { href: "/admin/shop/settings", label: "تنظیمات فروشگاه", desc: "باز/بسته بودن فروش" },
  { href: "/admin/forms", label: "فرم‌ساز", desc: "ساخت و ویرایش فرم‌ها" },
  { href: "/admin/centers", label: "مراکز", desc: "صفحه‌های مراکز" },
  { href: "/admin/team", label: "تیم", desc: "معرفی همکاران در سایت" },
  { href: "/admin/achievements", label: "افتخارات", desc: "رتبه‌ها و قبولی‌ها" },
  { href: "/admin/gallery", label: "گالری", desc: "آلبوم‌ها و عکس‌ها" },
  { href: "/admin/faq", label: "سؤالات متداول", desc: "پرسش و پاسخ‌ها" },
  { href: "/admin/settings", label: "تنظیمات سایت", desc: "تلفن، آدرس، متن‌ها" },
  { href: "/admin/users", label: "همکاران", desc: "حساب‌ها و دسترسی‌ها" },
];

function StaffHome({ me }: { me: AdminUser }) {
  const need = Object.fromEntries(ROUTE_PERM);
  const links = HOME_LINKS.filter((l) => need[l.href] && me.perms.has(need[l.href]!));
  return (
    <>
      <PageTitle title={`سلام ${me.name}`} sub="بخش‌هایی که به آن‌ها دسترسی دارید:" />
      {links.length === 0 ? (
        <Empty>هنوز دسترسی‌ای برای شما تعریف نشده است. با مدیر هماهنگ کنید.</Empty>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="group rounded-2xl border border-line bg-paper p-5 transition hover:-translate-y-0.5 hover:border-navy/25 hover:shadow-md">
              <p className="text-lg font-extrabold text-navy group-hover:text-royal">{l.label} ←</p>
              <p className="mt-1 text-sm text-muted">{l.desc}</p>
            </Link>
          ))}
        </div>
      )}
      <Panel title="دسترسی‌های شما" className="mt-6">
        <div className="flex flex-wrap gap-2">
          {[...me.perms].map((p) => <span key={p} className="chip bg-sky text-royal">{PERM_LABEL[p] ?? p}</span>)}
          {me.perms.size === 0 && <span className="text-sm text-muted">—</span>}
        </div>
      </Panel>
    </>
  );
}
