/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSettings, type Branch } from "@/lib/settings";
import { getPublicForm } from "@/lib/forms/public";
import { prettyPhone, telHref } from "@/lib/format";
import { FormRenderer } from "@/components/forms/FormRenderer";
import { Star, Eyebrow, SectionHead } from "./Star";
import { accentOf, AchievementCard, TeamCard } from "./cards";

export async function CenterPage({ slug }: { slug: "education" | "ghalamchi" }) {
  const center = await prisma.center.findUnique({ where: { slug } });
  if (!center || !center.published) notFound();
  const a = accentOf(slug);
  const isGc = slug === "ghalamchi";
  const [settings, form, achievements, team, albums] = await Promise.all([
    getSettings(),
    center.formSlug ? getPublicForm(center.formSlug) : null,
    prisma.achievement.findMany({
      where: { published: true, ...(isGc ? { featured: true } : {}) },
      orderBy: [{ featured: "desc" }, { sortOrder: "asc" }],
      take: 4,
    }),
    isGc
      ? Promise.resolve([])
      : prisma.teamMember.findMany({
          where: { published: true, department: { in: ["مدرسان و همکاران آموزشی", "مشاوران", "آموزگاران و معلمان"] } },
          orderBy: { sortOrder: "asc" },
          take: 8,
        }),
    prisma.galleryAlbum.findMany({
      where: { published: true, center: slug },
      orderBy: { sortOrder: "asc" },
      include: { photos: { orderBy: { sortOrder: "asc" }, take: 4 } },
    }),
  ]);
  const highlights = center.highlights as { title: string; text?: string }[];
  const branches = center.branches as Branch[];
  const paragraphs = (center.body ?? "").split(/\n\s*\n/).filter((p) => p.trim());

  return (
    <>
      <section className="relative overflow-hidden border-b border-line bg-paper">
        <div className={`absolute inset-x-0 top-0 h-1.5 ${a.bg}`} />
        <Star filled={false} className={`pointer-events-none absolute -top-20 -left-16 size-80 ${a.text} opacity-10`} />
        <div className="container-x relative grid items-center gap-10 py-12 sm:py-16 lg:grid-cols-[1.1fr_1fr]">
          <div>
            <div className="flex items-center gap-3">
              {isGc ? (
                <img src="/brand/ghalamchi.jpg" alt="لوگوی کانون فرهنگی آموزش قلم‌چی" className="size-12 rounded-xl border border-line object-cover" />
              ) : (
                <span className={`flex size-12 items-center justify-center rounded-xl ${a.soft}`}><Star className={`size-6 ${a.text}`} /></span>
              )}
              <Eyebrow tone={a.tone}>{isGc ? "نمایندگی رسمی کانون فرهنگی آموزش" : "از سال ۱۳۹۴ در نسیم‌شهر"}</Eyebrow>
            </div>
            <h1 className="mt-5 text-3xl leading-snug font-extrabold text-navy sm:text-[2.6rem] sm:leading-[1.35]">{center.name}</h1>
            {center.tagline && <p className={`mt-3 text-lg font-semibold ${a.text}`}>{center.tagline}</p>}
            {center.intro && <p className="mt-4 max-w-xl leading-9 text-ink/85">{center.intro}</p>}
            <div className="mt-8 flex flex-wrap gap-3">
              <a href="#register" className="btn-gold">پیش‌ثبت‌نام</a>
              {settings.contact.phones[0] && (
                <a href={telHref(settings.contact.phones[0])} className="btn-ghost"><span dir="ltr">{prettyPhone(settings.contact.phones[0])}</span></a>
              )}
            </div>
          </div>
          {center.heroImage && (
            <div className="relative">
              <div className={`absolute -inset-2.5 -rotate-2 rounded-[1.75rem] ${a.bg} opacity-90`} />
              <img src={center.heroImage} alt={center.name} className="relative aspect-[4/3] w-full rounded-[1.5rem] object-cover" />
            </div>
          )}
        </div>
      </section>

      {highlights.length > 0 && (
        <section className="container-x py-16">
          <SectionHead eyebrow={isGc ? "خدمات نمایندگی" : "دوره‌ها و خدمات"} title={isGc ? "آنچه در قلم‌چی نسیم‌شهر دریافت می‌کنید" : "مسیرهای آموزشی آموزشگاه"} tone={a.tone} />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {highlights.map((h) => (
              <div key={h.title} className="card relative overflow-hidden p-6">
                <span className={`absolute inset-y-0 right-0 w-1 ${a.bg}`} />
                <p className="flex items-center gap-2 text-lg font-extrabold text-navy"><Star className={`size-4 ${a.text}`} />{h.title}</p>
                {h.text && <p className="mt-2 leading-8 text-muted">{h.text}</p>}
              </div>
            ))}
          </div>
          {paragraphs.length > 0 && (
            <div className="prose-fa mt-10 max-w-3xl text-[1.05rem]">{paragraphs.map((p, i) => <p key={i}>{p}</p>)}</div>
          )}
        </section>
      )}

      {branches.length > 0 && (
        <section className={`${a.soft} py-16`}>
          <div className="container-x">
            <SectionHead eyebrow="شعبه‌ها" title="دو شعبه مجزا برای دختران و پسران" tone={a.tone} />
            <div className="grid gap-4 md:grid-cols-2">
              {branches.map((b) => (
                <div key={b.name} className="card p-6">
                  <p className={`text-lg font-extrabold ${a.text}`}>{b.name}</p>
                  <p className="mt-2 leading-8">{b.address}</p>
                  {b.mapUrl && <a href={b.mapUrl} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex text-sm font-bold text-navy hover:underline">مسیریابی در نقشه ←</a>}
                </div>
              ))}
            </div>
            <p className="mt-6 text-sm text-muted">ساعات کاری: {settings.contact.hours.join(" — ")}</p>
          </div>
        </section>
      )}

      {achievements.length > 0 && (
        <section className="container-x py-16">
          <SectionHead eyebrow="افتخارات" title="نتایج دانش‌آموزان ستارگان" tone={a.tone} action={<Link href="/achievements" className="btn-ghost text-sm">همه افتخارات</Link>} />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{achievements.map((x) => <AchievementCard key={x.id} a={x} />)}</div>
        </section>
      )}

      {team.length > 0 && (
        <section className="container-x pb-16">
          <SectionHead eyebrow="مدرسان و مشاوران" title="همراهان آموزشی شما" tone={a.tone} action={<Link href="/team" className="btn-ghost text-sm">همه اعضای تیم</Link>} />
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">{team.map((m) => <TeamCard key={m.id} m={m} />)}</div>
        </section>
      )}

      {albums.map((al) => (
        <section key={al.id} className="container-x pb-16">
          <SectionHead eyebrow="گالری" title={al.title} tone={a.tone} action={<Link href={`/gallery/${al.slug}`} className="btn-ghost text-sm">مشاهده آلبوم</Link>} />
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {al.photos.map((p) => <img key={p.id} src={p.path} alt={al.title} loading="lazy" className="aspect-[4/3] w-full rounded-2xl object-cover" />)}
          </div>
        </section>
      ))}

      {form && (
        <section id="register" className="scroll-mt-24 border-t border-line bg-paper py-16">
          <div className="container-x grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <Eyebrow tone={a.tone}>پیش‌ثبت‌نام</Eyebrow>
              <h2 className="h-section mt-2">{form.title}</h2>
              {form.description && <p className="mt-3 text-muted">{form.description}</p>}
              {isGc && <p className="mt-6 rounded-2xl bg-gc-soft p-4 text-sm leading-7 text-gc">برای ثبت‌نام در آزمون‌های قلم‌چی، گزینه «آزمون‌های قلم‌چی» را انتخاب کنید تا همکاران نمایندگی با شما تماس بگیرند.</p>}
            </div>
            <div className="card p-5 sm:p-8">
              <FormRenderer form={form} accent={a.tone} defaults={{ section: isGc ? "آزمون‌های قلم‌چی" : "کلاس‌های تقویتی و کنکور" }} />
            </div>
          </div>
        </section>
      )}
    </>
  );
}
