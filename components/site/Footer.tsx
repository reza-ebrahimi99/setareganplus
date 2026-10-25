import Link from "next/link";
import Image from "next/image";
import type { ContactSettings } from "@/lib/settings";
import { prettyPhone, telHref } from "@/lib/format";
import { Icon, Star } from "./Star";

const LINKS = [
  { href: "/education", label: "آموزشگاه تقویتی و کنکور ستارگان" },
  { href: "/ghalamchi", label: "نمایندگی قلم‌چی نسیم‌شهر" },
  { href: "/shop", label: "فروشگاه جزوه" },
  { href: "/order", label: "پیگیری سفارش جزوه" },
  { href: "/register", label: "پیش‌ثبت‌نام" },
  { href: "/forms", label: "ثبت‌نام‌های آنلاین" },
];
// local guide pages (real content from site data; see lib/seo.ts LANDINGS)
const GUIDES = [
  { href: "/konkur-nasimshahr", label: "کنکور در نسیم‌شهر" },
  { href: "/amoozeshgah-taghviati-nasimshahr", label: "آموزشگاه تقویتی نسیم‌شهر" },
  { href: "/kelas-taghviati", label: "کلاس تقویتی به تفکیک پایه" },
  { href: "/ghalamchi-nasimshahr", label: "آزمون‌های قلم‌چی نسیم‌شهر" },
  { href: "/jozve-konkur", label: "جزوه کنکور" },
];
const MORE = [
  { href: "/news", label: "اخبار و اطلاعیه‌ها" },
  { href: "/achievements", label: "افتخارات" },
  { href: "/team", label: "تیم ما" },
  { href: "/gallery", label: "گالری" },
  { href: "/about", label: "درباره ما" },
  { href: "/faq", label: "سؤالات متداول" },
  { href: "/contact", label: "تماس با ما" },
];

export function Footer({ contact }: { contact: ContactSettings; shopOpen?: boolean }) {
  const year = new Intl.DateTimeFormat("fa-IR-u-ca-persian", { year: "numeric" }).format(new Date());
  return (
    <footer className="print:hidden bg-hero relative mt-20 overflow-hidden text-white/75 sm:mt-28">
      <div className="bg-dots pointer-events-none absolute inset-0 opacity-60 [mask-image:linear-gradient(to_bottom,black,transparent_70%)]" />
      <Star filled={false} className="pointer-events-none absolute -bottom-28 -right-20 size-[26rem] text-white/[0.05]" />
      <div className="container-x relative">
        {/* CTA strip */}
        <div className="reveal relative -mb-px flex flex-col items-start justify-between gap-5 border-b border-white/10 py-10 sm:flex-row sm:items-center">
          <div>
            <p className="text-2xl font-black text-white sm:text-3xl">آماده‌ی شروع هستید؟</p>
            <p className="mt-2 text-white/65">فرم کوتاه پیش‌ثبت‌نام را پر کنید تا همکاران ما با شما تماس بگیرند.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/register" className="btn-gold">پیش‌ثبت‌نام آنلاین</Link>
            <Link href="/shop" className="btn-ghost-dark"><Icon name="bag" className="size-4" />خرید جزوه</Link>
          </div>
        </div>

        <div className="grid gap-10 py-12 md:grid-cols-2 lg:grid-cols-[1.3fr_0.8fr_0.8fr_1.1fr]">
          <div>
            <div className="flex items-center gap-3">
              <span className="flex size-12 items-center justify-center rounded-2xl bg-white shadow-lg shadow-black/20">
                <Image src="/brand/logo.png" alt="" width={36} height={30} />
              </span>
              <div>
                <p className="text-lg font-black text-white">مؤسسه علمی ستارگان</p>
                <p className="text-sm text-gold">چون تو لایق بهترینی...</p>
              </div>
            </div>
            <p className="mt-5 max-w-sm text-sm leading-7 text-white/60">
              آموزشگاه تقویتی و کنکور ستارگان و نمایندگی رسمی قلم‌چی نسیم‌شهر؛ دو مرکز در کنار دانش‌آموزان و خانواده‌ها.
            </p>
            {contact.social.length > 0 && (
              <div className="mt-6 flex flex-wrap gap-2">
                {contact.social.map((s) => (
                  <a key={s.url} href={s.url} target="_blank" rel="noopener noreferrer" className="glass rounded-full px-4 py-1.5 text-sm font-semibold text-white/85 transition-colors hover:bg-white/15 hover:text-white">
                    {s.label}
                  </a>
                ))}
              </div>
            )}
          </div>
          <nav aria-label="دسترسی سریع">
            <p className="mb-4 font-bold text-white">دسترسی سریع</p>
            <ul className="space-y-2.5 text-sm">
              {LINKS.map((l) => <li key={l.href}><Link href={l.href} className="transition-colors hover:text-gold">{l.label}</Link></li>)}
            </ul>
          </nav>
          <nav aria-label="مؤسسه">
            <p className="mb-4 font-bold text-white">مؤسسه</p>
            <ul className="space-y-2.5 text-sm">
              {MORE.map((l) => <li key={l.href}><Link href={l.href} className="transition-colors hover:text-gold">{l.label}</Link></li>)}
            </ul>
          </nav>
          <div>
            <p className="mb-4 font-bold text-white">تماس و نشانی</p>
            {contact.phones.length > 0 && (
              <ul className="grid grid-cols-2 gap-2 text-sm">
                {contact.phones.map((p) => (
                  <li key={p}>
                    <a href={telHref(p)} dir="ltr" className="glass flex justify-center rounded-xl px-2 py-2 font-bold text-white hover:bg-white/15">{prettyPhone(p)}</a>
                  </li>
                ))}
              </ul>
            )}
            <ul className="mt-4 space-y-3 text-sm leading-7">
              {contact.branches.map((b) => (
                <li key={b.name} className="flex gap-2">
                  <Icon name="pin" className="mt-1 size-4 shrink-0 text-gold" />
                  <span>
                    <b className="text-white">{b.name}: </b>{b.address}
                    {b.mapUrl && <a href={b.mapUrl} target="_blank" rel="noopener noreferrer" className="mr-2 font-semibold text-gold hover:underline">نقشه</a>}
                  </span>
                </li>
              ))}
              {contact.hours.length > 0 && (
                <li className="flex gap-2"><Icon name="clock" className="mt-1 size-4 shrink-0 text-gold" /><span>{contact.hours.join(" · ")}</span></li>
              )}
            </ul>
            {contact.enamadUrl && (
              <a href={contact.enamadUrl} target="_blank" rel="noopener noreferrer" referrerPolicy="origin" className="mt-5 inline-block">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={contact.enamadUrl.replace("trustseal.enamad.ir/?", "trustseal.enamad.ir/logo.aspx?")}
                  alt="نماد اعتماد الکترونیکی"
                  referrerPolicy="origin"
                  className="h-20 w-auto rounded-xl bg-white p-1"
                />
              </a>
            )}
          </div>
        </div>
      </div>
      <div className="relative border-t border-white/10">
        <nav aria-label="راهنماها" className="container-x flex flex-wrap items-center gap-x-4 gap-y-2 py-4 text-xs text-white/55">
          <span className="font-bold text-white/70">راهنما:</span>
          {GUIDES.map((g) => <Link key={g.href} href={g.href} className="hover:text-gold">{g.label}</Link>)}
        </nav>
      </div>
      <div className="relative border-t border-white/10">
        <div className="container-x flex flex-col gap-2 py-5 text-xs text-white/45 sm:flex-row sm:justify-between">
          <span>© {year} مؤسسه علمی ستارگان، نسیم‌شهر. همه حقوق محفوظ است.</span>
          <span className="flex items-center gap-1.5"><Star className="size-3 text-gold" />ستارگان پلاس</span>
        </div>
      </div>
    </footer>
  );
}
