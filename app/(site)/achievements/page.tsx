import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHero } from "@/components/site/Star";
import { AchievementCard } from "@/components/site/cards";
import { fa } from "@/lib/format";
import { Icon } from "@/components/site/Star";
import { HONORS_PATH, latestHonors } from "@/lib/honors";

export async function generateMetadata(): Promise<Metadata> {
  return pageMeta("achievements");
}

const TABS = [
  { key: "", label: "همه" },
  { key: "GIFTED", label: "تیزهوشان و نمونه دولتی" },
  { key: "KONKUR", label: "کنکور" },
] as const;

export default async function Achievements({ searchParams }: { searchParams: Promise<{ c?: string }> }) {
  const { c = "" } = await searchParams;
  const cat = c === "GIFTED" || c === "KONKUR" ? c : undefined;
  const [items, counts] = await Promise.all([
    prisma.achievement.findMany({ where: { published: true, ...(cat ? { category: cat } : {}) }, orderBy: [{ featured: "desc" }, { sortOrder: "asc" }] }),
    prisma.achievement.groupBy({ by: ["category"], where: { published: true }, _count: true }),
  ]);
  const count = (k: string) => (k ? counts.find((x) => x.category === k)?._count ?? 0 : counts.reduce((s, x) => s + x._count, 0));
  return (
    <>
      <PageHero eyebrow="افتخارات" title="دانش‌آموزانی که به هدفشان رسیدند" text="قبولی‌های کنکور، مدارس تیزهوشان و نمونه دولتی دانش‌آموزان ستارگان." />
      <div className="container-x py-12">
        <Link href={HONORS_PATH} className="group mb-8 flex items-center gap-4 rounded-[1.5rem] border border-gold/40 bg-gradient-to-l from-[#fff8e6] via-white to-sky p-4 shadow-[var(--shadow-soft)] transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-lift)] sm:p-5">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#ffc83d] to-gold text-navy shadow-lg"><Icon name="trophy" className="size-6" /></span>
          <span className="min-w-0 flex-1">
            <b className="block text-navy sm:text-lg">رتبه‌های برتر کنکور {fa(latestHonors().year)} قلم‌چی نسیم‌شهر</b>
            <span className="block text-sm text-muted">ریاضی، تجربی و انسانی؛ با عکس و رتبهٔ هر دانش‌آموز</span>
          </span>
          <Icon name="arrow" className="size-5 shrink-0 text-royal transition-transform group-hover:-translate-x-1" />
        </Link>
        <nav className="mb-8 flex flex-wrap gap-2">
          {TABS.map((t) => (
            <Link key={t.key} href={t.key ? `/achievements?c=${t.key}` : "/achievements"} className={`rounded-full border px-4 py-2 text-sm font-semibold ${c === t.key ? "border-royal bg-royal text-white shadow-[var(--shadow-glow)]" : "border-line bg-paper text-ink shadow-[var(--shadow-soft)] hover:border-royal/30"}`}>
              {t.label} <span className="opacity-60">({fa(count(t.key))})</span>
            </Link>
          ))}
        </nav>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4">{items.map((a) => <AchievementCard key={a.id} a={a} />)}</div>
      </div>
    </>
  );
}
