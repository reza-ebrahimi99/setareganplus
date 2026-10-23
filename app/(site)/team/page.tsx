/* eslint-disable @next/next/no-img-element */
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { PageHero, Star } from "@/components/site/Star";

export const metadata: Metadata = { title: "تیم ما", description: "مدیران، مشاوران و مدرسان مؤسسه علمی ستارگان." };

export default async function Team() {
  const team = await prisma.teamMember.findMany({ where: { published: true }, orderBy: { sortOrder: "asc" } });
  const groups = new Map<string, typeof team>();
  for (const m of team) {
    const k = m.department || "سایر همکاران";
    groups.set(k, [...(groups.get(k) ?? []), m]);
  }
  return (
    <>
      <PageHero eyebrow="تیم ما" title="چهره‌هایی که مسیر را هدایت می‌کنند" text="مدیران، مشاوران، مدرسان و همکاران اجرایی مؤسسه علمی ستارگان." />
      <div className="container-x space-y-14 py-14">
        {[...groups].map(([dept, members]) => (
          <section key={dept}>
            <h2 className="mb-6 flex items-center gap-2 text-xl font-extrabold text-navy"><Star className="size-4 text-gold" />{dept}</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {members.map((m) => (
                <article key={m.id} className="card flex gap-4 p-4">
                  <div className="size-24 shrink-0 overflow-hidden rounded-2xl bg-ivory sm:size-28">
                    {m.photo ? <img src={m.photo} alt={m.name} loading="lazy" className="size-full object-cover object-top" /> : <div className="flex size-full items-center justify-center"><Star className="size-10 text-line" /></div>}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-extrabold text-navy">{m.name}</h3>
                    <p className="text-sm font-medium text-edu">{m.role}</p>
                    {m.bio && (
                      <ul className="mt-2 space-y-0.5 text-[0.82rem] leading-6 text-muted">
                        {m.bio.split("\n").filter(Boolean).slice(0, 4).map((b) => <li key={b}>• {b}</li>)}
                      </ul>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>
    </>
  );
}
