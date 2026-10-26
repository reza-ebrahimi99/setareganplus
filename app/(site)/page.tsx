/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { responsive } from "@/lib/img";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { prettyPhone, telHref } from "@/lib/format";
import { Star, Sparkle, Icon, Eyebrow, SectionHead, type IconName } from "@/components/site/Star";
import { CenterCard, StatsBand, AchievementCard, TeamCard } from "@/components/site/cards";
import { listProducts } from "@/lib/shop/catalog";
import { getShopSettings } from "@/lib/shop/settings";
import { ProductCard } from "@/components/shop/ProductCard";
import type { Metadata } from "next";
import { organizationLd, pageMeta, websiteLd } from "@/lib/seo";
import { homeNews } from "@/lib/news";
import { JsonLd } from "@/components/site/JsonLd";
import { NewsCard } from "@/components/site/news";
import { HomeHighlight } from "@/components/site/HomeHighlight";
import { FormCard } from "@/components/forms/FormCard";
import { listedForms } from "@/lib/forms/public";

export async function generateMetadata(): Promise<Metadata> {
  return pageMeta("home");
}

export default async function Home() {
  const [s, centers, achievements, team, albums, booklets, shop, forms, faqs] = await Promise.all([
    getSettings(),
    prisma.center.findMany({ where: { published: true }, orderBy: { sortOrder: "asc" } }),
    prisma.achievement.findMany({ where: { published: true }, orderBy: [{ featured: "desc" }, { sortOrder: "asc" }], take: 10 }),
    prisma.teamMember.findMany({ where: { published: true, featured: true }, orderBy: { sortOrder: "asc" }, take: 4 }),
    prisma.galleryAlbum.findMany({
      where: { published: true },
      orderBy: { sortOrder: "asc" },
      include: { photos: { orderBy: { sortOrder: "asc" }, take: 3 } },
    }),
    listProducts({}, 8).catch(() => []),
    getShopSettings(),
    prisma.form.findMany({ where: { status: "PUBLISHED" }, orderBy: [{ isSystem: "desc" }, { createdAt: "asc" }], select: { slug: true, title: true, description: true } }),
    prisma.faq.findMany({ where: { published: true }, orderBy: { sortOrder: "asc" }, take: 4 }),
  ]);
  const [news, orgLd, openForms] = await Promise.all([homeNews().catch(() => []), organizationLd(), listedForms(3).then((x) => x.filter((f) => f.state === "open" || f.state === "soon")).catch(() => [])]);
  const { home, about, contact, stats, highlight } = s;
  const founder = about.founder;
  const mosaic = albums.flatMap((a) => a.photos.map((p) => ({ ...p, album: a }))).slice(0, 5);
  const words = home.title.trim().split(/\s+/);
  const cut = words.length > 3 ? words.length - 2 : words.length;
  const phone = contact.phones[0];

  const quick: { href: string; title: string; text: string; icon: IconName; tone: string }[] = [
    { href: "/register", title: "پیش‌ثبت‌نام", text: "فرم کوتاه آنلاین، تماس همکاران ما", icon: "form", tone: "from-[#ffc83d] to-gold text-navy" },
    { href: "/shop", title: "فروشگاه جزوه", text: "خرید آنلاین، تحویل حضوری در شعبه", icon: "bag", tone: "from-royal to-royal-2 text-white" },
    { href: "/ghalamchi", title: "آزمون‌های قلم‌چی", text: "نمایندگی رسمی در نسیم‌شهر", icon: "book", tone: "from-[#e0464f] to-[#b8233a] text-white" },
    { href: "/order", title: "پیگیری سفارش", text: "وضعیت جزوه و کد تحویل", icon: "qr", tone: "from-[#16a37f] to-[#0e7a62] text-white" },
  ];

  return (
    <>
      <JsonLd data={[orgLd, websiteLd()]} />
      {/* ───────── Highlight (first thing visitors see; toggle in admin settings) ───────── */}
      <HomeHighlight h={highlight} />
      {/* ───────── Hero ───────── */}
      <section className="bg-hero relative overflow-hidden text-white">
        <div className="bg-dots pointer-events-none absolute inset-0 [mask-image:radial-gradient(60%_70%_at_75%_30%,black,transparent)]" />
        <Star filled={false} className="pointer-events-none absolute -top-28 -left-28 size-[30rem] text-white/[0.05]" />
        <Sparkle className="animate-twinkle pointer-events-none absolute top-16 right-[48%] hidden size-4 text-gold lg:block" />
        <Sparkle className="animate-twinkle pointer-events-none absolute top-[42%] left-[6%] size-3 text-white/70 [animation-delay:1.4s]" />
        <Sparkle className="animate-twinkle pointer-events-none absolute bottom-[30%] right-[4%] size-2.5 text-gold [animation-delay:.7s]" />

        <div className="container-x relative grid items-center gap-12 pt-10 pb-28 sm:pt-14 lg:grid-cols-[1.05fr_1fr] lg:gap-14 lg:pt-20 lg:pb-36">
          <div>
            {home.eyebrow && <span className="rise inline-block"><Eyebrow tone="light">{home.eyebrow}</Eyebrow></span>}
            <h1 className="rise rise-1 mt-5 text-[2.35rem] leading-[1.3] font-black tracking-tight sm:text-[3.6rem] sm:leading-[1.22]">
              {words.slice(0, cut).join(" ")}{" "}
              {cut < words.length && (
                <span className="relative inline-block">
                  <span className="text-gradient">{words.slice(cut).join(" ")}</span>
                  <svg viewBox="0 0 200 12" preserveAspectRatio="none" aria-hidden="true" className="absolute inset-x-0 -bottom-1.5 h-3 w-full text-gold/70">
                    <path d="M2 9C50 3 150 1 198 7" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" />
                  </svg>
                </span>
              )}
              <span className="mt-4 block text-lg leading-8 font-extrabold tracking-normal text-gold sm:text-2xl sm:leading-10">آموزشگاه کنکور و نمایندگی قلم‌چی نسیم شهر</span>
            </h1>
            {home.subtitle && <p className="rise rise-2 mt-6 max-w-xl text-[1.05rem] leading-9 text-white/75 sm:text-lg">{home.subtitle}</p>}
            {home.slogan && (
              <p className="rise rise-2 mt-4 inline-flex items-center gap-2 font-semibold text-gold"><Star className="size-4" />{home.slogan}</p>
            )}
            <div className="rise rise-3 mt-8 flex flex-wrap gap-3">
              <Link href="/register" className="btn-gold px-7 py-3.5 text-base">پیش‌ثبت‌نام آنلاین</Link>
              <Link href="/shop" className="btn glass px-6 py-3.5 text-base text-white hover:bg-white/15"><Icon name="bag" className="size-5" />خرید جزوه</Link>
            </div>
            <div className="rise rise-4 mt-8 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-white/60">
              <span className="flex items-center gap-1.5"><Icon name="check" className="size-4 text-gold" strokeWidth={2.4} />آموزشگاه تقویتی و کنکور</span>
              <span className="flex items-center gap-1.5"><Icon name="check" className="size-4 text-gold" strokeWidth={2.4} />نمایندگی رسمی قلم‌چی</span>
              <span className="flex items-center gap-1.5"><Icon name="check" className="size-4 text-gold" strokeWidth={2.4} />شعبه دختران و پسران</span>
            </div>
          </div>

          <div className="rise rise-2 relative mx-auto w-full max-w-xl">
            <div className="pointer-events-none absolute -inset-8 rounded-full bg-royal/40 blur-3xl" />
            <div className="relative rotate-[-2deg] rounded-[2rem] bg-gradient-to-br from-gold via-[#ffcf5a] to-[#ff9f43] p-1.5 shadow-2xl shadow-black/40">
              <div className="overflow-hidden rounded-[1.7rem] bg-navy">
                {home.heroImage ? (
                  <img {...responsive(home.heroImage, "(min-width: 1024px) 560px, 92vw")} alt="دانش‌آموزان مؤسسه علمی ستارگان" width={1000} height={750} loading="lazy" decoding="async" className="aspect-[4/3] w-full rotate-[2deg] scale-[1.06] object-cover object-bottom" />
                ) : (
                  <div className="flex aspect-[4/3] items-center justify-center"><Star className="size-24 text-white/10" /></div>
                )}
              </div>
            </div>
            <div className="animate-float absolute -bottom-6 right-3 flex items-center gap-3 rounded-2xl bg-white/95 px-4 py-3 text-ink shadow-2xl shadow-black/30 backdrop-blur sm:right-6">
              <img src="/brand/ghalamchi-96.webp" alt="" width={40} height={40} loading="lazy" className="size-10 rounded-xl object-cover" />
              <span className="text-sm leading-6"><b className="block text-navy">نمایندگی رسمی قلم‌چی</b><span className="text-muted">نسیم‌شهر · دختران و پسران</span></span>
            </div>
            <Link href="/shop" className="animate-float absolute -top-5 left-2 hidden items-center gap-2.5 rounded-2xl bg-white/95 px-3.5 py-2.5 text-ink shadow-2xl shadow-black/30 backdrop-blur [animation-delay:1.5s] sm:flex">
              <span className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-royal to-royal-2 text-white"><Icon name="bag" className="size-[1.1rem]" /></span>
              <span className="text-sm leading-5"><b className="block text-navy">فروشگاه جزوه</b><span className="text-xs text-muted">خرید آنلاین</span></span>
            </Link>
          </div>
        </div>

        {stats.length > 0 && (
          <div className="container-x relative -mt-14 pb-24 lg:-mt-20 lg:pb-28">
            <StatsBand stats={stats} dark />
          </div>
        )}
      </section>

      {/* ───────── Quick actions (overlaps hero) ───────── */}
      <section className="container-x relative z-10 -mt-14 sm:-mt-16">
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {quick.map((q) => (
            <Link key={q.href} href={q.href} className="group card card-hover relative flex flex-col gap-3 overflow-hidden !rounded-[1.5rem] p-4 sm:flex-row sm:items-center sm:p-5">
              <span className={`flex size-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br shadow-lg ${q.tone}`}><Icon name={q.icon} className="size-6" /></span>
              <span className="min-w-0 flex-1">
                <b className="block text-[1.02rem] text-navy">{q.title}</b>
                <span className="block text-xs leading-5 text-muted sm:text-[0.8rem]">{q.text}</span>
              </span>
              <Icon name="arrow" className="absolute top-4 left-4 size-4 text-muted/60 transition-all group-hover:-translate-x-1 group-hover:text-royal sm:static" strokeWidth={2.2} />
            </Link>
          ))}
        </div>
      </section>

      {/* ───────── News & announcements (hidden when empty) ───────── */}
      {news.length > 0 && (
        <section aria-labelledby="home-news" className="container-x pt-16 sm:pt-20">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <Eyebrow>اخبار و اطلاعیه‌ها</Eyebrow>
              <h2 id="home-news" className="h-section mt-3">تازه‌های <span className="text-gradient-blue">ستارگان</span></h2>
            </div>
            <Link href="/news" className="btn-ghost px-5 py-2.5 text-sm">همهٔ اخبار و اطلاعیه‌ها <Icon name="arrow" className="size-4" /></Link>
          </div>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {news.slice(0, 3).map((n) => <NewsCard key={n.id} n={n} />)}
          </div>
          {news.length > 3 && (
            <ul className="mt-6 divide-y divide-line overflow-hidden rounded-2xl border border-line bg-paper">
              {news.slice(3).map((n) => (
                <li key={n.id}><Link href={`/news/${n.slug}`} className="flex items-center justify-between gap-4 px-5 py-3.5 text-sm font-bold text-navy hover:bg-ivory"><span className="truncate">{n.pinned && "📌 "}{n.title}</span><Icon name="arrow" className="size-4 shrink-0 text-muted" /></Link></li>
              ))}
            </ul>
          )}
        </section>
      )}

      {/* ───────── Open registrations (hidden when none) ───────── */}
      {openForms.length > 0 && (
        <section aria-labelledby="home-forms" className="container-x pt-16 sm:pt-20" data-home-forms>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <Eyebrow>ثبت‌نام آنلاین</Eyebrow>
              <h2 id="home-forms" className="h-section mt-3">ثبت‌نام‌های <span className="text-gradient-blue">باز</span></h2>
            </div>
            <Link href="/forms" className="btn-ghost px-5 py-2.5 text-sm">همهٔ ثبت‌نام‌ها <Icon name="arrow" className="size-4" /></Link>
          </div>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {openForms.map((f) => <FormCard key={f.slug} f={f} />)}
          </div>
        </section>
      )}

      {/* ───────── Centers ───────── */}
      {centers.length > 0 && (
        <section id="centers" className="container-x scroll-mt-24 py-20 sm:py-28">
          <SectionHead
            center
            eyebrow="مراکز مجموعه"
            title={<>دو مرکز، <span className="text-gradient-blue">یک مسیر روشن</span></>}
            text="مؤسسه علمی ستارگان در نسیم‌شهر با دو مرکز در کنار دانش‌آموزان و خانواده‌هاست."
          />
          <div className="grid gap-6 md:grid-cols-2 lg:gap-8">
            {centers.map((c) => (
              <CenterCard
                key={c.id}
                slug={c.slug}
                name={c.name}
                tagline={c.tagline}
                image={c.heroImage}
                points={(c.highlights as { title: string }[]).slice(0, 4).map((h) => h.title)}
              />
            ))}
          </div>
        </section>
      )}

      {/* ───────── Booklet shop ───────── */}
      {shop.open && booklets.length > 0 && (
        <section className="container-x">
          <div className="reveal bg-royal-panel relative overflow-hidden rounded-[2rem] px-5 py-10 text-white sm:px-10 sm:py-14 lg:px-14">
            <div className="bg-dots pointer-events-none absolute inset-0 opacity-70" />
            <Star filled={false} className="pointer-events-none absolute -top-16 -left-16 size-80 text-white/10" />
            <Sparkle className="animate-twinkle pointer-events-none absolute top-10 left-[40%] size-3 text-gold" />
            <div className="relative grid items-end gap-8 lg:grid-cols-[1fr_auto]">
              <div>
                <Eyebrow tone="light">فروشگاه جزوه</Eyebrow>
                <h2 className="mt-3 text-[1.75rem] leading-snug font-black sm:text-[2.5rem]">جزوه‌های آموزشی ستارگان،<br className="hidden sm:block" /> <span className="text-gradient">یک کلیک تا دستان شما</span></h2>
                <ul className="mt-6 grid gap-3 text-sm sm:grid-cols-3 sm:gap-4">
                  {([
                    ["shield", "پرداخت امن آنلاین", "درگاه زیبال"],
                    ["sms", "پیامک آماده‌شدن", "اطلاع‌رسانی خودکار"],
                    ["qr", "تحویل با کد QR", "در شعبه، بدون معطلی"],
                  ] as [IconName, string, string][]).map(([ic, t, d]) => (
                    <li key={t} className="glass flex items-center gap-3 rounded-2xl p-3">
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/15 text-gold"><Icon name={ic} className="size-5" /></span>
                      <span><b className="block text-white">{t}</b><span className="text-xs text-white/65">{d}</span></span>
                    </li>
                  ))}
                </ul>
              </div>
              <Link href="/shop" className="btn-gold shrink-0 px-7 py-3.5 text-base">مشاهده همه جزوه‌ها <Icon name="arrow" className="size-4" strokeWidth={2.4} /></Link>
            </div>
            <div className="no-scrollbar relative -mx-5 mt-10 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-2 sm:mx-0 sm:grid sm:grid-cols-3 sm:gap-5 sm:overflow-visible sm:px-0 lg:grid-cols-4">
              {booklets.map((p, i) => (
                <div key={p.id} className={`w-[46%] shrink-0 snap-start sm:w-auto ${i >= 6 ? "sm:hidden" : i >= 4 ? "lg:hidden" : ""}`}>
                  <ProductCard p={p} />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ───────── Achievements ───────── */}
      {achievements.length > 0 && (
        <section className="py-20 sm:py-28">
          <div className="container-x">
            <SectionHead
              eyebrow="افتخارات"
              title={<>دانش‌آموزانی که <span className="text-gradient-blue">به هدفشان رسیدند</span></>}
              text="قبولی‌های کنکور، تیزهوشان و نمونه دولتی دانش‌آموزان ستارگان."
              action={<Link href="/achievements" className="btn-ghost text-sm">همه افتخارات <Icon name="arrow" className="size-4" /></Link>}
            />
          </div>
          <div className="container-x">
            <div className="no-scrollbar -mx-5 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-4 sm:-mx-8 sm:gap-5 sm:px-8 lg:mx-0 lg:grid lg:grid-cols-5 lg:overflow-visible lg:px-0">
              {achievements.map((a) => (
                <div key={a.id} className="w-[58%] shrink-0 snap-start sm:w-[30%] lg:w-auto">
                  <AchievementCard a={a} />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ───────── Founder ───────── */}
      {founder.name && (
        <section className="relative overflow-hidden border-y border-line bg-paper py-20 sm:py-28">
          <div className="bg-dots-dark pointer-events-none absolute inset-0 [mask-image:radial-gradient(50%_60%_at_80%_50%,black,transparent)]" />
          <div className="container-x relative grid items-center gap-12 md:grid-cols-[0.85fr_1.15fr] lg:gap-16">
            <div className="reveal relative mx-auto w-full max-w-sm">
              <div className="absolute -inset-3 rotate-3 rounded-[2rem] bg-gradient-to-br from-royal to-royal-2 opacity-90" />
              <Star className="absolute -top-6 -right-6 z-10 size-14 text-gold drop-shadow-lg" />
              {founder.photo ? (
                <img {...responsive(founder.photo, "384px", 960)} alt={`پرتره ${founder.name}`} className="relative aspect-[4/5] w-full rounded-[1.75rem] object-cover" loading="lazy" decoding="async" />
              ) : (
                <div className="relative flex aspect-[4/5] items-center justify-center rounded-[1.75rem] bg-sky"><Star className="size-20 text-royal/20" /></div>
              )}
              <div className="absolute -bottom-5 left-1/2 w-[85%] -translate-x-1/2 rounded-2xl bg-white px-4 py-3 text-center shadow-[var(--shadow-lift)]">
                <b className="block text-navy">{founder.name}</b>
                {founder.title && <span className="text-xs font-semibold text-royal">{founder.title}</span>}
              </div>
            </div>
            <div className="reveal">
              <Eyebrow>سخن مؤسس</Eyebrow>
              <h2 className="h-section mt-3">{founder.name}</h2>
              {founder.title && <p className="mt-1 font-bold text-royal">{founder.title}</p>}
              {founder.bio && (
                <blockquote className="relative mt-6 rounded-[1.5rem] border border-line bg-ivory/70 p-6 leading-9 text-ink/85">
                  <span aria-hidden className="absolute -top-5 right-5 font-serif text-6xl leading-none text-gold">”</span>
                  {founder.bio}
                </blockquote>
              )}
              {founder.points.length > 0 && (
                <ul className="mt-6 grid gap-3 sm:grid-cols-2">
                  {founder.points.map((p) => (
                    <li key={p} className="flex gap-2.5 text-[0.95rem] font-medium">
                      <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-gold/20 text-gold-ink"><Icon name="check" className="size-3.5" strokeWidth={2.6} /></span>
                      {p}
                    </li>
                  ))}
                </ul>
              )}
              <Link href="/about" className="btn-ghost mt-8 text-sm">درباره مؤسسه <Icon name="arrow" className="size-4" /></Link>
            </div>
          </div>
        </section>
      )}

      {/* ───────── Team ───────── */}
      {team.length > 0 && (
        <section className="container-x py-20 sm:py-28">
          <SectionHead
            eyebrow="تیم ما"
            title={<>چهره‌هایی که <span className="text-gradient-blue">مسیر را هدایت می‌کنند</span></>}
            action={<Link href="/team" className="btn-ghost text-sm">همه اعضای تیم <Icon name="arrow" className="size-4" /></Link>}
          />
          <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
            {team.map((m) => <TeamCard key={m.id} m={m} />)}
          </div>
        </section>
      )}

      {/* ───────── Forms / registration ───────── */}
      {forms.length > 0 && (
        <section className="container-x pb-20 sm:pb-28">
          <div className="reveal relative overflow-hidden rounded-[2rem] border border-gold/30 bg-gradient-to-br from-[#fff8e6] via-white to-sky p-6 sm:p-10 lg:p-12">
            <Star className="pointer-events-none absolute -bottom-10 -left-10 size-56 text-gold/10" />
            <div className="relative grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
              <div>
                <Eyebrow>ثبت‌نام آنلاین</Eyebrow>
                <h2 className="h-section mt-3">گام بعدی را <span className="text-gradient-blue">همین امروز</span> بردارید</h2>
                <p className="mt-3 leading-8 text-muted">فرم موردنظرتان را آنلاین پر کنید؛ همکاران ما در اولین فرصت با شما تماس می‌گیرند.</p>
                {phone && (
                  <a href={telHref(phone)} className="mt-6 inline-flex items-center gap-3 rounded-2xl bg-white px-4 py-3 shadow-[var(--shadow-soft)] ring-1 ring-line transition-transform hover:-translate-y-0.5">
                    <span className="flex size-10 items-center justify-center rounded-xl bg-sky text-royal"><Icon name="phone" className="size-5" /></span>
                    <span className="text-sm leading-6"><span className="block text-muted">ترجیح می‌دهید تماس بگیرید؟</span><b dir="ltr" className="text-navy">{prettyPhone(phone)}</b></span>
                  </a>
                )}
              </div>
              <div className="grid gap-3">
                {forms.map((f, i) => (
                  <Link
                    key={f.slug}
                    href={f.slug === "pre-registration" ? "/register" : `/f/${encodeURIComponent(f.slug)}`}
                    className="group card card-hover flex items-center gap-4 !rounded-[1.4rem] p-4 sm:p-5"
                  >
                    <span className={`flex size-12 shrink-0 items-center justify-center rounded-2xl shadow-lg ${i === 0 ? "bg-gradient-to-br from-[#ffc83d] to-gold text-navy" : "bg-gradient-to-br from-royal to-royal-2 text-white"}`}>
                      <Icon name="form" className="size-6" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <b className="block leading-7 text-navy">{f.title}</b>
                      {f.description && <span className="line-clamp-1 text-sm text-muted">{f.description}</span>}
                    </span>
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-ivory text-royal transition-transform group-hover:-translate-x-1"><Icon name="arrow" className="size-4" strokeWidth={2.4} /></span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ───────── Gallery ───────── */}
      {mosaic.length > 0 && (
        <section className="border-y border-line bg-paper py-20 sm:py-28">
          <div className="container-x">
            <SectionHead
              eyebrow="گالری"
              title={<>لحظه‌هایی از <span className="text-gradient-blue">ستارگان</span></>}
              action={<Link href="/gallery" className="btn-ghost text-sm">ورود به گالری <Icon name="arrow" className="size-4" /></Link>}
            />
            <div className="grid auto-rows-[8.5rem] grid-cols-2 gap-3 sm:auto-rows-[12rem] md:grid-cols-4 md:gap-4">
              {mosaic.map((p, i) => (
                <Link key={p.id} href={`/gallery/${p.album.slug}`} className={`reveal group relative overflow-hidden rounded-[1.25rem] bg-line ${i === 0 ? "col-span-2 row-span-2" : ""}`}>
                  <img {...responsive(p.path, i === 0 ? "(min-width: 768px) 50vw, 92vw" : "(min-width: 768px) 25vw, 46vw", 960)} alt={p.caption || p.album.title} loading="lazy" decoding="async" className="size-full object-cover transition-transform duration-700 group-hover:scale-[1.06]" />
                  <span aria-hidden="true" className="absolute inset-0 flex items-end bg-gradient-to-t from-navy/70 via-transparent to-transparent p-3 text-sm font-bold text-white opacity-0 transition-opacity group-hover:opacity-100">{p.album.title}</span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ───────── In short (plain words people search for; every line links to the full page) ───────── */}
      <section aria-labelledby="glance-title" className="container-x py-16 sm:py-20">
        <SectionHead
          eyebrow="ستارگان در یک نگاه"
          title={<span id="glance-title">آموزشگاه ستارگان؛ <span className="text-gradient-blue">کنکور، قلم‌چی و جزوه</span> در نسیم شهر</span>}
          text="مؤسسه علمی ستارگان (ستارگان پلاس) در نسیم‌شهر، شهرستان بهارستان، با دو شعبهٔ جداگانه برای دختران و پسران فعالیت می‌کند."
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { href: "/konkur-nasimshahr", title: "کلاس کنکور و مشاوره کنکور", text: "کلاس‌های کنکور، برنامه‌ریزی درسی و مشاورهٔ کنکور برای داوطلبان نسیم‌شهر." },
            { href: "/ghalamchi-nasimshahr", title: "نمایندگی قلم چی نسیم شهر", text: "نمایندگی رسمی کانون فرهنگی آموزش؛ ثبت‌نام و برگزاری آزمون‌های قلم‌چی." },
            { href: "/amoozeshgah-taghviati-nasimshahr", title: "آموزشگاه تقویتی و کلاس تقویتی", text: "کلاس‌های تقویتی دروس مدرسه به تفکیک پایه، از تقویت پایه تا کنکور." },
            { href: "/jozve-konkur", title: "جزوه کنکور", text: "خرید آنلاین جزوه کنکور و جزوه‌های درسی، تحویل حضوری در شعبه." },
          ].map((x) => (
            <Link key={x.href} href={x.href} className="card card-hover block p-6">
              <h3 className="text-lg font-extrabold text-navy">{x.title}</h3>
              <p className="mt-2 text-sm leading-7 text-ink/75">{x.text}</p>
              <span className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-royal">بیشتر بخوانید <Icon name="arrow" className="size-4" /></span>
            </Link>
          ))}
        </div>
      </section>

      {/* ───────── FAQ teaser ───────── */}
      {faqs.length > 0 && (
        <section className="container-x py-20 sm:py-28">
          <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
            <SectionHead
              eyebrow="سؤالات متداول"
              title={<>پاسخ <span className="text-gradient-blue">پرسش‌های رایج</span></>}
              text="پاسخ سؤال خود را پیدا نکردید؟ با ما تماس بگیرید."
              action={<Link href="/faq" className="btn-ghost text-sm lg:hidden">همه سؤالات</Link>}
            />
            <div className="space-y-3">
              {faqs.map((f, i) => (
                <details key={f.id} className="reveal group card p-5 transition-shadow open:shadow-[var(--shadow-lift)]" open={i === 0}>
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-bold text-navy [&::-webkit-details-marker]:hidden">
                    {f.question}
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-sky text-xl text-royal transition-transform duration-300 group-open:rotate-45">+</span>
                  </summary>
                  <p className="mt-3 leading-8 text-ink/80">{f.answer}</p>
                </details>
              ))}
              <Link href="/faq" className="hidden pt-2 text-sm font-bold text-royal hover:underline lg:inline-block">مشاهده همه سؤالات ←</Link>
            </div>
          </div>
        </section>
      )}

      {/* ───────── Contact ───────── */}
      {(contact.phones.length > 0 || contact.branches.length > 0) && (
        <section id="contact" className="container-x scroll-mt-24">
          <SectionHead center eyebrow="تماس و نشانی" title={<>به ما <span className="text-gradient-blue">سر بزنید</span></>} />
          <div className="grid gap-4 lg:grid-cols-3">
            {contact.branches.map((b) => (
              <div key={b.name} className="reveal card card-hover flex flex-col p-6">
                <span className="flex size-12 items-center justify-center rounded-2xl bg-sky text-royal"><Icon name="pin" className="size-6" /></span>
                <p className="mt-4 text-lg font-black text-navy">{b.name}</p>
                <p className="mt-2 flex-1 leading-8 text-ink/80">{b.address}</p>
                {b.mapUrl && (
                  <a href={b.mapUrl} target="_blank" rel="noopener noreferrer" className="btn-ghost mt-5 self-start px-4 py-2 text-sm">مسیریابی در نقشه <Icon name="arrow" className="size-4" /></a>
                )}
              </div>
            ))}
            <div className="reveal bg-hero relative flex flex-col overflow-hidden rounded-[var(--radius-card)] p-6 text-white">
              <Star filled={false} className="pointer-events-none absolute -bottom-10 -left-10 size-44 text-white/10" />
              <span className="flex size-12 items-center justify-center rounded-2xl bg-white/10 text-gold"><Icon name="phone" className="size-6" /></span>
              <p className="mt-4 text-lg font-black">تماس مستقیم</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {contact.phones.map((p) => (
                  <a key={p} href={telHref(p)} dir="ltr" className="glass rounded-xl px-2 py-2 text-center text-sm font-bold hover:bg-white/15">{prettyPhone(p)}</a>
                ))}
              </div>
              {contact.hours.length > 0 && (
                <ul className="mt-4 space-y-1 text-sm text-white/70">
                  {contact.hours.map((h) => <li key={h} className="flex items-center gap-2"><Icon name="clock" className="size-4 text-gold" />{h}</li>)}
                </ul>
              )}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
