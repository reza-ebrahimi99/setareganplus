/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSettings, type Branch } from "@/lib/settings";
import { getPublicForm } from "@/lib/forms/public";
import { fa, prettyPhone, telHref } from "@/lib/format";
import { FormRenderer } from "@/components/forms/FormRenderer";
import { Star, Sparkle, Icon, Eyebrow, SectionHead } from "./Star";
import { accentOf, AchievementCard, TeamCard } from "./cards";
import { JsonLd } from "./JsonLd";
import { breadcrumbLd } from "@/lib/ld";

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

  const phone = settings.contact.phones[0];

  return (
    <>
      <section className="bg-hero relative overflow-hidden text-white">
        <div className="bg-dots pointer-events-none absolute inset-0 [mask-image:radial-gradient(60%_70%_at_75%_30%,black,transparent)]" />
        <div className={`pointer-events-none absolute -top-24 left-[10%] size-96 rounded-full blur-3xl ${a.glow}`} />
        <Star filled={false} className="pointer-events-none absolute -bottom-24 -left-16 size-96 text-white/[0.05]" />
        <Sparkle className="animate-twinkle pointer-events-none absolute top-12 right-[45%] size-3 text-gold" />
        <div className="container-x relative grid items-center gap-12 pt-8 pb-16 sm:pt-12 sm:pb-20 lg:grid-cols-[1.1fr_1fr] lg:pb-24">
          <div>
            <JsonLd data={breadcrumbLd([{ name: center.shortName || center.name }])} />
            <nav aria-label="مسیر صفحه" className="rise mb-5 flex items-center gap-1.5 text-xs text-white/55">
              <Link href="/" className="hover:text-white">خانه</Link>
              <Icon name="arrow" className="size-3" />
              <span className="text-white/80" aria-current="page">{center.shortName || center.name}</span>
            </nav>
            <div className="rise flex items-center gap-3">
              {isGc ? (
                <img src="/brand/ghalamchi.jpg" alt="لوگوی کانون فرهنگی آموزش قلم‌چی" className="size-12 rounded-2xl object-cover ring-2 ring-white/20" />
              ) : (
                <span className={`flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br ${a.grad} shadow-lg`}><Star className="size-6 text-gold" /></span>
              )}
              <Eyebrow tone="light">{isGc ? "نمایندگی رسمی کانون فرهنگی آموزش" : "آموزشگاه تقویتی و کنکور"}</Eyebrow>
            </div>
            <h1 className="rise rise-1 mt-6 text-[2rem] leading-[1.35] font-black tracking-tight sm:text-[3.1rem] sm:leading-[1.25]">{center.name}</h1>
            {center.tagline && <p className="rise rise-2 mt-4 text-lg font-bold text-gold">{center.tagline}</p>}
            {center.intro && <p className="rise rise-2 mt-4 max-w-xl text-[1.02rem] leading-9 text-white/75">{center.intro}</p>}
            <div className="rise rise-3 mt-8 flex flex-wrap gap-3">
              {form && <a href="#register" className="btn-gold px-7 py-3.5 text-base">پیش‌ثبت‌نام</a>}
              {phone && (
                <a href={telHref(phone)} className="btn glass px-6 py-3.5 text-white hover:bg-white/15"><Icon name="phone" className="size-5" /><span dir="ltr">{prettyPhone(phone)}</span></a>
              )}
              <Link href="/shop" className="btn glass px-6 py-3.5 text-white hover:bg-white/15"><Icon name="bag" className="size-5" />جزوه‌ها</Link>
            </div>
          </div>
          {center.heroImage && (
            <div className="rise rise-2 relative mx-auto w-full max-w-xl">
              <div className={`pointer-events-none absolute -inset-8 rounded-full blur-3xl ${a.glow}`} />
              <div className={`relative rotate-2 rounded-[2rem] bg-gradient-to-br ${a.grad} p-1.5 shadow-2xl shadow-black/40`}>
                <img src={center.heroImage} alt={center.name} className="aspect-[4/3] w-full -rotate-2 scale-[1.03] rounded-[1.7rem] object-cover" />
              </div>
              {highlights.length > 0 && (
                <div className="animate-float absolute -bottom-6 right-4 flex items-center gap-2.5 rounded-2xl bg-white/95 px-4 py-3 text-ink shadow-2xl shadow-black/30">
                  <span className={`flex size-9 items-center justify-center rounded-xl ${a.soft} ${a.text}`}><Icon name="check" className="size-5" strokeWidth={2.6} /></span>
                  <span className="text-sm leading-5"><b className="block text-navy">{highlights[0].title}</b>{highlights[1] && <span className="text-xs text-muted">{highlights[1].title}</span>}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {highlights.length > 0 && (
        <section className="container-x py-20 sm:py-24">
          <SectionHead
            eyebrow={isGc ? "خدمات نمایندگی" : "دوره‌ها و خدمات"}
            title={isGc ? <>آنچه در <span className="text-gradient-blue">قلم‌چی نسیم‌شهر</span> دریافت می‌کنید</> : <>مسیرهای آموزشی <span className="text-gradient-blue">آموزشگاه</span></>}
            tone={a.tone}
          />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {highlights.map((h, i) => (
              <div key={h.title} className="reveal group card card-hover relative overflow-hidden p-6">
                <span className="pointer-events-none absolute -top-3 -left-1 text-7xl font-black text-ink/[0.04]">{fa(i + 1)}</span>
                <span className={`flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br ${a.grad} text-white shadow-lg transition-transform duration-300 group-hover:-rotate-6`}><Star className="size-5 text-gold" /></span>
                <p className="mt-4 text-lg font-black text-navy">{h.title}</p>
                {h.text && <p className="mt-2 leading-8 text-muted">{h.text}</p>}
              </div>
            ))}
          </div>
          {paragraphs.length > 0 && (
            <div className="reveal prose-fa mt-12 max-w-3xl rounded-[1.5rem] border border-line bg-paper p-6 text-[1.05rem] shadow-[var(--shadow-soft)] sm:p-8">{paragraphs.map((p, i) => <p key={i}>{p}</p>)}</div>
          )}
        </section>
      )}

      {branches.length > 0 && (
        <section className={`${a.soft} relative overflow-hidden py-20`}>
          <div className="bg-dots-dark pointer-events-none absolute inset-0" />
          <div className="container-x relative">
            <SectionHead eyebrow="شعبه‌ها" title="دو شعبه مجزا برای دختران و پسران" tone={a.tone} />
            <div className="grid gap-4 md:grid-cols-2">
              {branches.map((b) => (
                <div key={b.name} className="reveal card card-hover flex gap-4 p-6">
                  <span className={`flex size-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${a.grad} text-white shadow-lg`}><Icon name="pin" className="size-6" /></span>
                  <div>
                    <p className={`text-lg font-black ${a.text}`}>{b.name}</p>
                    <p className="mt-1 leading-8">{b.address}</p>
                    {b.mapUrl && <a href={b.mapUrl} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-navy hover:underline">مسیریابی در نقشه <Icon name="arrow" className="size-4" /></a>}
                  </div>
                </div>
              ))}
            </div>
            {settings.contact.hours.length > 0 && (
              <p className="mt-6 inline-flex items-center gap-2 rounded-full bg-paper px-4 py-2 text-sm text-muted shadow-[var(--shadow-soft)]"><Icon name="clock" className="size-4 text-gold" />ساعات کاری: {settings.contact.hours.join(" · ")}</p>
            )}
          </div>
        </section>
      )}

      {achievements.length > 0 && (
        <section className="container-x py-20">
          <SectionHead eyebrow="افتخارات" title="نتایج دانش‌آموزان ستارگان" tone={a.tone} action={<Link href="/achievements" className="btn-ghost text-sm">همه افتخارات <Icon name="arrow" className="size-4" /></Link>} />
          <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">{achievements.map((x) => <AchievementCard key={x.id} a={x} />)}</div>
        </section>
      )}

      {team.length > 0 && (
        <section className="container-x pb-20">
          <SectionHead eyebrow="مدرسان و مشاوران" title="همراهان آموزشی شما" tone={a.tone} action={<Link href="/team" className="btn-ghost text-sm">همه اعضای تیم <Icon name="arrow" className="size-4" /></Link>} />
          <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">{team.map((m) => <TeamCard key={m.id} m={m} />)}</div>
        </section>
      )}

      {albums.map((al) => (
        <section key={al.id} className="container-x pb-20">
          <SectionHead eyebrow="گالری" title={al.title} tone={a.tone} action={<Link href={`/gallery/${al.slug}`} className="btn-ghost text-sm">مشاهده آلبوم <Icon name="arrow" className="size-4" /></Link>} />
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {al.photos.map((p) => (
              <div key={p.id} className="reveal group overflow-hidden rounded-[1.25rem]">
                <img src={p.path} alt={al.title} loading="lazy" className="aspect-[4/3] w-full object-cover transition-transform duration-700 group-hover:scale-[1.06]" />
              </div>
            ))}
          </div>
        </section>
      ))}

      {form && (
        <section id="register" className="scroll-mt-24 border-t border-line bg-paper py-20">
          <div className="container-x grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
            <div className="lg:sticky lg:top-28 lg:self-start">
              <Eyebrow tone={a.tone}>پیش‌ثبت‌نام</Eyebrow>
              <h2 className="h-section mt-3">{form.title}</h2>
              {form.description && <p className="mt-3 leading-8 text-muted">{form.description}</p>}
              <ol className="mt-6 space-y-3 text-sm">
                {["فرم کوتاه را تکمیل کنید", "همکاران ما با شما تماس می‌گیرند", "مشاوره و ثبت‌نام نهایی"].map((t, i) => (
                  <li key={t} className="flex items-center gap-3">
                    <span className={`flex size-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${a.grad} font-black text-white`}>{fa(i + 1)}</span>
                    <span className="font-semibold text-ink/85">{t}</span>
                  </li>
                ))}
              </ol>
              {isGc && <p className="mt-6 rounded-2xl bg-gc-soft p-4 text-sm leading-7 text-gc">برای ثبت‌نام در آزمون‌های قلم‌چی، گزینه «آزمون‌های قلم‌چی» را انتخاب کنید تا همکاران نمایندگی با شما تماس بگیرند.</p>}
            </div>
            <div className="card relative overflow-hidden !rounded-[1.75rem] p-5 shadow-[var(--shadow-lift)] sm:p-8">
              <span className={`absolute inset-x-0 top-0 h-1.5 bg-gradient-to-l ${a.grad}`} />
              <FormRenderer form={form} accent={a.tone} defaults={{ section: isGc ? "آزمون‌های قلم‌چی" : "کلاس‌های تقویتی و کنکور" }} />
            </div>
          </div>
        </section>
      )}
    </>
  );
}
