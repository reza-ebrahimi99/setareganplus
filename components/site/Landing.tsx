import Link from "next/link";
import type { ReactNode } from "react";
import { LANDINGS, PAGES, faqLd, type PageKey } from "@/lib/seo";
import type { ContactSettings } from "@/lib/settings";
import { fa, prettyPhone, telHref } from "@/lib/format";
import { Icon, PageHero, SectionHead, Star, type IconName } from "./Star";
import { JsonLd } from "./JsonLd";
import { BranchList } from "./BranchList";

/** Shared hero for the local guide pages. */
export function LandingHero({ k, title, intro, phone, accent = "gold", cta }: { k: PageKey; title: string; intro: string; phone?: string; accent?: "gold" | "edu" | "gc"; cta?: { href: string; label: string } }) {
  return (
    <PageHero eyebrow="نسیم‌شهر · بهارستان" title={title} text={intro} crumbs={PAGES[k].label.replace(/^راهنما: /, "")} accent={accent}>
      <div className="mt-7 flex flex-wrap gap-3">
        <Link href={cta?.href ?? "/register"} className="btn-gold px-6 py-3">{cta?.label ?? "پیش‌ثبت‌نام آنلاین"}</Link>
        {phone && <a href={telHref(phone)} className="btn-ghost-dark px-6 py-3"><Icon name="phone" className="size-4" /><span dir="ltr">{prettyPhone(phone)}</span></a>}
      </div>
    </PageHero>
  );
}

export function Block({ id, eyebrow, title, text, children, tone = "plain" }: { id?: string; eyebrow?: string; title: ReactNode; text?: string; children: ReactNode; tone?: "plain" | "paper" }) {
  return (
    <section id={id} className={`scroll-mt-24 ${tone === "paper" ? "border-y border-line bg-paper py-14 sm:py-20" : "py-14 sm:py-20"}`}>
      <div className="container-x">
        <SectionHead eyebrow={eyebrow} title={title} text={text} />
        <div className="mt-8">{children}</div>
      </div>
    </section>
  );
}

export function FeatureGrid({ items }: { items: { title: string; text?: string; href?: string; icon?: IconName }[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((x) => {
        const inner = (
          <>
            <span className="flex size-11 items-center justify-center rounded-2xl bg-sky text-royal"><Icon name={x.icon ?? "check"} className="size-5" /></span>
            <h3 className="mt-4 text-lg font-extrabold text-navy">{x.title}</h3>
            {x.text && <p className="mt-2 text-sm leading-7 text-muted">{x.text}</p>}
          </>
        );
        return x.href ? (
          <Link key={x.title} href={x.href} className="card card-hover block p-6">{inner}</Link>
        ) : (
          <div key={x.title} className="card p-6">{inner}</div>
        );
      })}
    </div>
  );
}

export function Steps({ steps }: { steps: { title: string; text: ReactNode }[] }) {
  return (
    <ol className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {steps.map((s, i) => (
        <li key={s.title} className="card relative p-6">
          <span className="flex size-10 items-center justify-center rounded-full bg-navy text-base font-black text-gold">{fa(i + 1)}</span>
          <h3 className="mt-4 font-extrabold text-navy">{s.title}</h3>
          <div className="mt-2 text-sm leading-7 text-muted">{s.text}</div>
        </li>
      ))}
    </ol>
  );
}

/** Visible FAQ + matching FAQPage JSON-LD (same text, as Google requires). */
export function FaqBlock({ items, title = "پرسش‌های رایج" }: { items: { q: string; a: string }[]; title?: string }) {
  if (!items.length) return null;
  return (
    <section className="py-14 sm:py-20">
      <JsonLd data={faqLd(items)} />
      <div className="container-x max-w-4xl">
        <SectionHead eyebrow="سؤالات متداول" title={title} />
        <div className="mt-8 space-y-3">
          {items.map((x, i) => (
            <details key={x.q} open={i === 0} className="group card p-0 [&_summary::-webkit-details-marker]:hidden">
              <summary className="flex cursor-pointer items-center justify-between gap-4 p-5 font-extrabold text-navy">
                <h3 className="text-base">{x.q}</h3>
                <span className="text-xl text-royal transition group-open:rotate-45">+</span>
              </summary>
              <p className="px-5 pb-5 leading-8 text-ink/85">{x.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

export function WhereBlock({ contact, title = "نشانی شعبه‌ها و ساعات کاری" }: { contact: ContactSettings; title?: string }) {
  if (!contact.branches.length) return null;
  return (
    <Block eyebrow="کجا هستیم؟" title={title} tone="paper">
      <BranchList contact={contact} />
    </Block>
  );
}

const EXTRA = [
  { href: "/education", label: "آموزشگاه تقویتی و کنکور ستارگان" },
  { href: "/ghalamchi", label: "نمایندگی قلم‌چی نسیم‌شهر" },
  { href: "/shop", label: "فروشگاه جزوه" },
  { href: "/news", label: "اخبار و مقالات" },
  { href: "/register", label: "پیش‌ثبت‌نام آنلاین" },
  { href: "/contact", label: "تماس با ما" },
];

export function RelatedGuides({ current }: { current: PageKey }) {
  const guides = LANDINGS.filter((k) => k !== current).map((k) => ({ href: PAGES[k].path, label: PAGES[k].label.replace(/^راهنما: /, "") }));
  return (
    <section className="container-x pb-6">
      <div className="rounded-[1.75rem] border border-line bg-paper p-6 sm:p-8">
        <p className="flex items-center gap-2 font-black text-navy"><Star className="size-4 text-gold" />صفحه‌های مرتبط</p>
        <div className="mt-5 grid gap-6 sm:grid-cols-2">
          <ul className="space-y-2 text-sm">
            {guides.map((g) => <li key={g.href}><Link href={g.href} className="font-semibold text-royal hover:underline">{g.label}</Link></li>)}
          </ul>
          <ul className="space-y-2 text-sm">
            {EXTRA.map((g) => <li key={g.href}><Link href={g.href} className="font-semibold text-royal hover:underline">{g.label}</Link></li>)}
          </ul>
        </div>
      </div>
    </section>
  );
}

/** Who we are, both branches, and the paths that already exist on the site. */
export function LocalFacts({ contact, children, math = "link" }: { contact: ContactSettings; children: ReactNode; math?: "link" | "here" }) {
  return (
    <section className="container-x py-12 sm:py-16">
      <div className="prose-fa max-w-3xl text-[1.05rem]">
        {children}
        {contact.branches.length > 0 && <p>مؤسسه علمی ستارگان در نسیم‌شهر دو شعبه دارد: {branchesSentence(contact)}.</p>}
        {math === "link" ? (
          <p>
            کلاس ریاضی را <Link href="/kelas-riazi-nasimshahr" className="font-bold text-royal">مهندس رضا ابراهیمی</Link>، مدرس و مؤلف ریاضیات مجموعه، برگزار می‌کند.
            از همین سایت می‌توانید <Link href="/classes" className="font-bold text-royal">کلاس‌های ویدیویی</Link> را ببینید، از <Link href="/shop" className="font-bold text-royal">فروشگاه جزوه</Link> خرید کنید، <Link href="/moshavere" className="font-bold text-royal">وقت مشاوره</Link> بگیرید یا <Link href="/register" className="font-bold text-royal">پیش‌ثبت‌نام</Link> کنید.
          </p>
        ) : (
          <p>
            <Link href="/classes" className="font-bold text-royal">کلاس‌های ویدیویی</Link> ریاضی در صفحهٔ کلاس‌هاست.
            جزوه را از <Link href="/shop" className="font-bold text-royal">فروشگاه جزوه</Link> سفارش دهید، برای گفت‌وگو <Link href="/moshavere" className="font-bold text-royal">مشاوره</Link> بگیرید و ثبت‌نام را با <Link href="/register" className="font-bold text-royal">پیش‌ثبت‌نام</Link> شروع کنید.
            معرفی مدرس در <Link href="/about#founder" className="font-bold text-royal">صفحهٔ دربارهٔ ما</Link> آمده است.
          </p>
        )}
      </div>
    </section>
  );
}

/** Data-backed answer helpers. */
export function branchesSentence(c: ContactSettings) {
  return c.branches.map((b) => `${b.name}: ${b.address}`).join(" — ");
}
export function phonesSentence(c: ContactSettings, n = 2) {
  return c.phones.slice(0, n).map((p) => prettyPhone(p)).join(" یا ");
}
