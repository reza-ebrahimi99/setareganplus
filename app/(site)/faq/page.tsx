import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { PageHero } from "@/components/site/Star";

export const metadata: Metadata = { title: "سؤالات متداول" };

export default async function Faq() {
  const items = await prisma.faq.findMany({ where: { published: true }, orderBy: { sortOrder: "asc" } });
  return (
    <>
      <PageHero eyebrow="سؤالات متداول" title="پاسخ پرسش‌های رایج" />
      <div className="container-x max-w-3xl space-y-3 py-12">
        {items.map((f, i) => (
          <details key={f.id} className="card group p-5 open:shadow-sm" open={i === 0}>
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-bold text-navy [&::-webkit-details-marker]:hidden">
              {f.question}
              <span className="text-xl text-gold transition-transform group-open:rotate-45">+</span>
            </summary>
            <p className="mt-3 leading-8 text-ink/85">{f.answer}</p>
          </details>
        ))}
      </div>
    </>
  );
}
