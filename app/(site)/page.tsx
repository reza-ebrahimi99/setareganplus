/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { prettyPhone, telHref } from "@/lib/format";
import { Star, Eyebrow, SectionHead } from "@/components/site/Star";
import { CenterCard, StatsBand, AchievementCard, TeamCard } from "@/components/site/cards";
import { BranchList } from "@/components/site/BranchList";

export default async function Home() {
  const [s, centers, achievements, team, albums] = await Promise.all([
    getSettings(),
    prisma.center.findMany({ where: { published: true }, orderBy: { sortOrder: "asc" } }),
    prisma.achievement.findMany({ where: { published: true }, orderBy: [{ featured: "desc" }, { sortOrder: "asc" }], take: 8 }),
    prisma.teamMember.findMany({ where: { published: true, featured: true }, orderBy: { sortOrder: "asc" }, take: 4 }),
    prisma.galleryAlbum.findMany({
      where: { published: true },
      orderBy: { sortOrder: "asc" },
      include: { photos: { orderBy: { sortOrder: "asc" }, take: 3 } },
    }),
  ]);
  const { home, about, contact, stats } = s;
  const founder = about.founder;
  const mosaic = albums.flatMap((a) => a.photos.map((p) => ({ ...p, album: a }))).slice(0, 5);

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-navy text-white">
        <Star filled={false} className="pointer-events-none absolute -top-24 -left-24 size-[28rem] text-white/[0.06]" />
        <Star className="pointer-events-none absolute top-10 right-[46%] hidden size-4 text-gold lg:block" />
        <div className="container-x relative grid items-center gap-10 pt-12 pb-10 lg:grid-cols-[1.05fr_1fr] lg:pt-20 lg:pb-16">
          <div>
            <Eyebrow tone="light">{home.eyebrow}</Eyebrow>
            <h1 className="mt-4 text-[2.1rem] leading-[1.35] font-extrabold sm:text-5xl sm:leading-[1.3]">{home.title}</h1>
            <p className="mt-5 max-w-xl text-lg leading-9 text-white/75">{home.subtitle}</p>
            <p className="mt-4 text-gold">{home.slogan}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/register" className="btn-gold">پیش‌ثبت‌نام</Link>
              <a href="#centers" className="btn-ghost-dark">آشنایی با مراکز</a>
            </div>
          </div>
          <div className="relative">
            <div className="absolute -inset-1.5 -z-0 rotate-2 sm:-inset-3 rounded-[1.75rem] bg-gold/90" />
            <div className="relative overflow-hidden rounded-[1.5rem] border-4 border-navy">
              {home.heroImage && (
                <img src={home.heroImage} alt="دانش‌آموزان نمایندگی قلم‌چی نسیم‌شهر" className="aspect-[4/3] w-full object-cover object-bottom" />
              )}
            </div>
            <div className="absolute -bottom-5 right-5 flex items-center gap-3 rounded-2xl bg-paper px-4 py-3 text-ink shadow-xl shadow-black/20">
              <img src="/brand/ghalamchi.jpg" alt="" className="size-10 rounded-lg object-cover" />
              <span className="text-sm leading-6"><b className="block text-navy">نمایندگی رسمی قلم‌چی</b><span className="text-muted">نسیم‌شهر · شعبه دختران و پسران</span></span>
            </div>
          </div>
        </div>
        <div className="container-x relative pb-12 lg:pb-16">
          <StatsBand stats={stats} dark />
        </div>
      </section>

      {/* Centers */}
      <section id="centers" className="container-x scroll-mt-24 py-16 sm:py-20">
        <SectionHead eyebrow="مراکز مجموعه" title="دو مرکز، یک مسیر روشن" text="مؤسسه علمی ستارگان در نسیم‌شهر با دو مرکز در کنار دانش‌آموزان و خانواده‌هاست." />
        <div className="grid gap-6 md:grid-cols-2">
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

      {/* Achievements */}
      <section className="border-y border-line bg-paper py-16 sm:py-20">
        <div className="container-x">
          <SectionHead
            eyebrow="افتخارات"
            title="دانش‌آموزانی که به هدفشان رسیدند"
            text="قبولی‌های کنکور، تیزهوشان و نمونه دولتی دانش‌آموزان ستارگان."
            action={<Link href="/achievements" className="btn-ghost text-sm">مشاهده همه افتخارات</Link>}
          />
          <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {achievements.map((a) => <AchievementCard key={a.id} a={a} />)}
          </div>
        </div>
      </section>

      {/* Founder */}
      {founder.name && (
        <section className="container-x py-16 sm:py-20">
          <div className="grid items-center gap-10 md:grid-cols-[0.8fr_1.2fr]">
            <div className="relative mx-auto w-full max-w-sm">
              <Star className="absolute -top-5 -right-5 size-14 text-gold" />
              {founder.photo && <img src={founder.photo} alt={`پرتره ${founder.name}`} className="aspect-[4/5] w-full rounded-[1.5rem] object-cover" loading="lazy" />}
            </div>
            <div>
              <Eyebrow>مؤسس</Eyebrow>
              <h2 className="h-section mt-2">{founder.name}</h2>
              <p className="mt-1 font-semibold text-edu">{founder.title}</p>
              <p className="mt-4 leading-9 text-ink/85">{founder.bio}</p>
              <ul className="mt-6 grid gap-2.5 sm:grid-cols-2">
                {founder.points.map((p) => (
                  <li key={p} className="flex gap-2 text-[0.95rem]"><Star className="mt-1.5 size-3.5 shrink-0 text-gold" />{p}</li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      )}

      {/* Team */}
      {team.length > 0 && (
        <section className="container-x pb-16 sm:pb-20">
          <SectionHead eyebrow="تیم ما" title="چهره‌هایی که مسیر را هدایت می‌کنند" action={<Link href="/team" className="btn-ghost text-sm">همه اعضای تیم</Link>} />
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {team.map((m) => <TeamCard key={m.id} m={m} />)}
          </div>
        </section>
      )}

      {/* Gallery teaser */}
      {mosaic.length > 0 && (
        <section className="border-y border-line bg-paper py-16 sm:py-20">
          <div className="container-x">
            <SectionHead eyebrow="گالری" title="لحظه‌هایی از ستارگان" action={<Link href="/gallery" className="btn-ghost text-sm">ورود به گالری</Link>} />
            <div className="grid auto-rows-[9rem] grid-cols-2 gap-3 sm:auto-rows-[12rem] md:grid-cols-4">
              {mosaic.map((p, i) => (
                <Link key={p.id} href={`/gallery/${p.album.slug}`} className={`overflow-hidden rounded-2xl bg-line ${i === 0 ? "col-span-2 row-span-2" : ""}`}>
                  <img src={p.path} alt={p.album.title} loading="lazy" className="size-full object-cover transition-transform duration-500 hover:scale-[1.03]" />
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Register CTA */}
      <section className="container-x py-16 sm:py-20">
        <div className="relative overflow-hidden rounded-[1.75rem] bg-navy px-6 py-10 text-white sm:px-12 sm:py-14">
          <Star filled={false} className="pointer-events-none absolute -bottom-16 -left-10 size-72 text-white/[0.07]" />
          <div className="relative grid items-center gap-8 md:grid-cols-[1.4fr_1fr]">
            <div>
              <Eyebrow tone="light">پیش‌ثبت‌نام</Eyebrow>
              <h2 className="mt-2 text-2xl leading-snug font-extrabold sm:text-3xl">گام بعدی را همین امروز بردارید</h2>
              <p className="mt-3 text-white/70">فرم کوتاه پیش‌ثبت‌نام را پر کنید تا همکاران ما در زمینه موردنظرتان با شما تماس بگیرند.</p>
            </div>
            <div className="flex flex-col gap-3 md:items-end">
              <Link href="/register" className="btn-gold w-full md:w-auto">تکمیل فرم پیش‌ثبت‌نام</Link>
              {contact.phones[0] && (
                <a href={telHref(contact.phones[0])} className="text-sm text-white/70 hover:text-white">یا تماس: <span dir="ltr">{prettyPhone(contact.phones[0])}</span></a>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Branches */}
      <section className="container-x pb-4">
        <SectionHead eyebrow="شعبه‌ها" title="نشانی و ساعات کاری" />
        <BranchList contact={contact} />
      </section>
    </>
  );
}
