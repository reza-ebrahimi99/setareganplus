"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Icon, Star, type IconName } from "./Star";

/** wide: 1 = shown from xl (1280px), 2 = only on very wide screens; always in the mobile menu. */
export const NAV: { href: string; label: string; icon: IconName; wide?: 1 | 2 }[] = [
  { href: "/education", label: "آموزشگاه ستارگان", icon: "cap" },
  { href: "/ghalamchi", label: "قلم‌چی نسیم‌شهر", icon: "book" },
  { href: "/achievements", label: "افتخارات", icon: "trophy" },
  { href: "/news", label: "اخبار", icon: "news" },
  { href: "/team", label: "تیم ما", icon: "users", wide: 2 },
  { href: "/gallery", label: "گالری", icon: "image", wide: 2 },
  { href: "/about", label: "درباره ما", icon: "info", wide: 1 },
  { href: "/contact", label: "تماس", icon: "phone" },
];

function isActive(path: string, href: string) {
  return path === href || path.startsWith(href + "/");
}

export function Header({ shopOpen = true, phone }: { shopOpen?: boolean; phone?: { href: string; label: string } }) {
  const path = usePathname() || "/";
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [top, setTop] = useState(64);
  const hdr = useRef<HTMLElement>(null);

  useEffect(() => setOpen(false), [path]);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 8);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  useEffect(() => {
    if (open && hdr.current) setTop(Math.max(0, Math.round(hdr.current.getBoundingClientRect().bottom)));
    document.documentElement.style.overflow = open ? "hidden" : "";
    const k = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [open]);

  return (
    <>
      {shopOpen && !/^\/(shop|order|booklet|o)(\/|$)/.test(path) && (
        <Link
          href="/shop"
          className="print:hidden group relative z-50 block overflow-hidden bg-gradient-to-l from-royal to-royal-2 text-white"
        >
          <span className="container-x flex h-9 items-center justify-center gap-2 text-[0.8rem] font-semibold sm:text-sm">
            <Star className="size-3.5 text-gold" />
            <span className="truncate">فروشگاه جزوه ستارگان: خرید آنلاین و تحویل حضوری در شعبه</span>
            <span className="hidden shrink-0 items-center gap-1 rounded-full bg-white/15 px-2.5 py-0.5 text-xs group-hover:bg-white/25 sm:inline-flex">
              مشاهده <Icon name="arrow" className="size-3" strokeWidth={2.4} />
            </span>
          </span>
        </Link>
      )}
      <header ref={hdr} className={`print:hidden sticky top-0 z-40 transition-[background-color,box-shadow,border-color] duration-300 ${scrolled || open ? "border-b border-line/70 bg-white/90 shadow-[0_8px_30px_-18px_rgb(10_26_63/0.35)] backdrop-blur-xl" : "border-b border-transparent bg-white/70 backdrop-blur"}`}>
        <div className="container-x flex h-16 items-center justify-between gap-3 sm:h-[4.5rem]">
          <Link href="/" className="flex shrink-0 items-center gap-2.5" aria-label="ستارگان پلاس، صفحه اصلی">
            <span className="flex size-10 items-center justify-center rounded-2xl bg-gradient-to-br from-sky to-white ring-1 ring-line">
              <Image src="/brand/logo.png" alt="" width={44} height={37} priority className="h-7 w-auto" />
            </span>
            <span className="leading-tight">
              <span className="block text-[1.05rem] font-black text-navy">ستارگان پلاس</span>
              <span className="block text-[0.68rem] font-medium text-muted">مؤسسه علمی ستارگان · نسیم‌شهر</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-0.5 lg:flex" aria-label="منوی اصلی">
            {NAV.map((n) => {
              const on = isActive(path, n.href);
              return (
                <Link
                  key={n.href}
                  href={n.href}
                  aria-current={on ? "page" : undefined}
                  className={`${n.wide === 2 ? "hidden 2xl:inline-flex" : n.wide ? "hidden xl:inline-flex" : "inline-flex"} relative whitespace-nowrap rounded-full px-3 py-2 text-[0.9rem] font-semibold transition-colors ${on ? "bg-sky text-royal" : "text-ink/75 hover:bg-ivory hover:text-navy"}`}
                >
                  {n.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            <Link href="/shop" className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-bold transition-all ${isActive(path, "/shop") ? "bg-royal text-white" : "bg-navy text-white hover:-translate-y-0.5 hover:bg-navy-2"}`}>
                <Icon name="bag" className="size-4" strokeWidth={2} />
                <span className="sm:hidden">جزوه</span>
                <span className="hidden whitespace-nowrap sm:inline">فروشگاه جزوه</span>
              </Link>
            <Link href="/register" className="btn-gold hidden px-5 py-2 text-sm md:inline-flex">پیش‌ثبت‌نام</Link>
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              aria-controls="mobile-menu"
              aria-label={open ? "بستن منو" : "باز کردن منو"}
              className="flex size-10 items-center justify-center rounded-full border border-line bg-paper text-navy shadow-[var(--shadow-soft)] lg:hidden"
            >
              <Icon name={open ? "close" : "menu"} className="size-5" strokeWidth={2.2} />
            </button>
          </div>
        </div>

      </header>
        {/* Mobile sheet */}
        <div
          id="mobile-menu"
          style={{ top }}
          className={`print:hidden lg:hidden fixed inset-x-0 bottom-0 z-40 transition-[opacity,visibility] duration-300 ${open ? "visible opacity-100" : "invisible opacity-0"}`}
        >
          <button type="button" aria-label="بستن منو" onClick={() => setOpen(false)} className="absolute inset-0 bg-navy/40 backdrop-blur-sm" />
          <div className={`relative max-h-full overflow-y-auto rounded-b-[1.75rem] bg-paper px-5 pt-4 pb-6 shadow-2xl transition-transform duration-300 ${open ? "translate-y-0" : "-translate-y-4"}`}>
            <div className="grid grid-cols-2 gap-2.5">
              {[{ href: "/", label: "خانه", icon: "home" as IconName }, ...NAV].map((n) => {
                const on = n.href === "/" ? path === "/" : isActive(path, n.href);
                return (
                  <Link key={n.href} href={n.href} className={`flex items-center gap-2.5 rounded-2xl border px-3.5 py-3 text-[0.95rem] font-bold ${on ? "border-royal/30 bg-sky text-royal" : "border-line bg-ivory/60 text-navy"}`}>
                    <span className={`flex size-8 items-center justify-center rounded-xl ${on ? "bg-royal text-white" : "bg-white text-royal ring-1 ring-line"}`}><Icon name={n.icon} className="size-[1.1rem]" /></span>
                    {n.label}
                  </Link>
                );
              })}
              <Link href="/faq" className="flex items-center gap-2.5 rounded-2xl border border-line bg-ivory/60 px-3.5 py-3 text-[0.95rem] font-bold text-navy">
                <span className="flex size-8 items-center justify-center rounded-xl bg-white text-royal ring-1 ring-line"><Icon name="help" className="size-[1.1rem]" /></span>
                سؤالات متداول
              </Link>
            </div>
            {(
              <Link href="/shop" className="bg-royal-panel mt-3 flex items-center justify-between gap-3 rounded-2xl p-4 text-white">
                <span className="flex items-center gap-3">
                  <span className="flex size-10 items-center justify-center rounded-xl bg-white/15"><Icon name="bag" className="size-5" /></span>
                  <span><b className="block">فروشگاه جزوه</b><span className="text-xs text-white/75">خرید آنلاین، تحویل حضوری با کد QR</span></span>
                </span>
                <Icon name="arrow" className="size-5" />
              </Link>
            )}
            <div className="mt-3 grid grid-cols-2 gap-2.5">
              <Link href="/register" className="btn-gold w-full">پیش‌ثبت‌نام</Link>
              {phone ? (
                <a href={phone.href} className="btn-ghost w-full"><Icon name="phone" className="size-4" /><span dir="ltr">{phone.label}</span></a>
              ) : (
                <Link href="/order" className="btn-ghost w-full">پیگیری سفارش</Link>
              )}
            </div>
          </div>
        </div>
    </>
  );
}
