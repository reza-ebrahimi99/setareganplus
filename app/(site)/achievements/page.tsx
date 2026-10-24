import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHero } from "@/components/site/Star";
import { AchievementCard } from "@/components/site/cards";
import { fa } from "@/lib/format";

export const metadata: Metadata = { title: "افتخارات", description: "قبولی‌های کنکور، تیزهوشان و نمونه دولتی دانش‌آموزان ستارگان." };

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
