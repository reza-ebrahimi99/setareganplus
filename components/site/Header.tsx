"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { Icon, Star, type IconName } from "./Star";

type Leaf = { href: string; label: string; icon: IconName };
type Entry = { label: string; icon: IconName; href?: string; highlight?: boolean; children?: Leaf[] };

/** Seven top-level items. School and language-center pages stay on the site, linked from the footer only. */
export const NAV: Entry[] = [
  { href: "/shop", label: "فروشگاه", icon: "bag" },
  { href: "/classes", label: "کلاس‌های ویدیویی", icon: "play" },
  { href: "/safar", label: "سفر ستاره‌ها", icon: "pin", highlight: true },
  { href: "/moshavere", label: "مشاوره رایگان", icon: "chat" },
  { href: "/news", label: "اخبار و مقالات", icon: "news" },
  {
    label: "قلم‌چی نسیم‌شهر",
    icon: "book",
    children: [
      { href: "/ghalamchi", label: "نمایندگی قلم‌چی", icon: "book" },
      { href: "/rotbe-bartar-konkur", label: "رتبه‌های برتر", icon: "trophy" },
      { href: "/achievements", label: "افتخارات", icon: "cap" },
      { href: "/test-motalee", label: "تست الگوی مطالعه", icon: "help" },
    ],
  },
  {
    label: "ستارگان",
    icon: "cap",
    children: [
      { href: "/education", label: "آموزشگاه ستارگان", icon: "cap" },
      { href: "/team", label: "تیم ما", icon: "users" },
      { href: "/gallery", label: "گالری", icon: "image" },
      { href: "/about", label: "درباره ما", icon: "info" },
      { href: "/contact", label: "تماس با ما", icon: "phone" },
    ],
  },
];

function isActive(path: string, href: string) {
  return path === href || path.startsWith(href + "/");
}

function entryOn(path: string, item: Entry) {
  if (item.href && isActive(path, item.href)) return true;
  return !!item.children?.some((c) => isActive(path, c.href));
}

function Chevron({ open }: { open?: boolean }) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className={`size-3.5 shrink-0 opacity-70 transition-transform ${open ? "rotate-180" : ""}`}>
      <path d="M4 6.5 8 10.5 12 6.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Header({ shopOpen = true, phone }: { shopOpen?: boolean; phone?: { href: string; label: string } }) {
  const path = usePathname() || "/";
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [top, setTop] = useState(64);
  const [menu, setMenu] = useState<string | null>(null);
  const [acc, setAcc] = useState<string | null>(null);
  const hdr = useRef<HTMLElement>(null);
  const menuBase = useId();

  useEffect(() => {
    setOpen(false);
    setMenu(null);
    setAcc(null);
  }, [path]);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 8);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  useEffect(() => {
    if (open && hdr.current) setTop(Math.max(0, Math.round(hdr.current.getBoundingClientRect().bottom)));
    document.documentElement.style.overflow = open ? "hidden" : "";
    const k = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      setMenu(null);
    };
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
        <div className="container-x flex h-16 flex-nowrap items-center justify-between gap-2 sm:h-[4.5rem] lg:gap-3">
          <Link href="/" className="flex shrink-0 items-center gap-2.5" title="صفحه اصلی">
            <span className="flex size-10 items-center justify-center rounded-2xl bg-gradient-to-br from-sky to-white ring-1 ring-line">
              <Image src="/brand/logo.png" alt="" width={44} height={37} priority className="h-7 w-auto" />
            </span>
            <span className="leading-tight">
              <span className="block text-[1.05rem] font-black text-navy">ستارگان پلاس</span>
              <span className="hidden text-[0.68rem] font-medium text-muted xl:block">مؤسسه علمی ستارگان · نسیم‌شهر</span>
            </span>
          </Link>

          <nav className="hidden min-w-0 flex-1 items-center justify-center gap-0.5 lg:flex" aria-label="منوی اصلی">
            {NAV.map((item) => {
              const on = entryOn(path, item);
              const tone = item.highlight
                ? on
                  ? "bg-[#c9963e] text-[#3f2d1c]"
                  : "bg-[#fff6df] text-[#8e342c] ring-1 ring-[#e2c27a] hover:bg-[#f3e2bc]"
                : on
                  ? "bg-sky text-royal"
                  : "text-ink/80 hover:bg-ivory hover:text-navy";
              const itemClass = `inline-flex items-center gap-1 whitespace-nowrap rounded-full px-1.5 py-1.5 text-[0.78rem] font-semibold transition-colors xl:px-2.5 xl:text-[0.9rem] ${tone}`;
              if (item.href && !item.children) {
                return (
                  <Link key={item.label} href={item.href} aria-current={on ? "page" : undefined} className={itemClass}>
                    {item.label}
                  </Link>
                );
              }
              const panelId = `${menuBase}-${item.label}`;
              const shown = menu === item.label;
              return (
                <div
                  key={item.label}
                  className="group relative"
                  onMouseEnter={() => setMenu(item.label)}
                  onMouseLeave={() => setMenu((cur) => (cur === item.label ? null : cur))}
                  onBlur={(e) => {
                    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setMenu((cur) => (cur === item.label ? null : cur));
                  }}
                >
                  <button
                    type="button"
                    className={itemClass}
                    aria-expanded={shown}
                    aria-haspopup="menu"
                    aria-controls={panelId}
                    onClick={() => setMenu(shown ? null : item.label)}
                    onKeyDown={(e) => {
                      if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setMenu(item.label);
                        requestAnimationFrame(() => document.getElementById(panelId)?.querySelector("a")?.focus());
                      }
                    }}
                  >
                    {item.label}
                    <Chevron open={shown} />
                  </button>
                  <div className={`absolute top-full start-0 z-50 pt-2 group-hover:pointer-events-auto group-hover:visible group-focus-within:pointer-events-auto group-focus-within:visible ${shown ? "" : "pointer-events-none invisible"}`}>
                    <div id={panelId} role="menu" aria-hidden={!shown} className="min-w-56 rounded-2xl border border-line bg-white p-1.5 shadow-[0_18px_40px_-24px_rgb(10_26_63/0.45)]">
                      {item.children?.map((child) => {
                        const childOn = isActive(path, child.href);
                        return (
                          <Link
                            key={child.href}
                            href={child.href}
                            role="menuitem"
                            tabIndex={shown ? 0 : -1}
                            aria-current={childOn ? "page" : undefined}
                            onClick={() => setMenu(null)}
                            className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-bold ${childOn ? "bg-sky text-royal" : "text-navy hover:bg-ivory"}`}
                          >
                            <Icon name={child.icon} className="size-4 text-royal" />
                            {child.label}
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </nav>

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <Link href="/shop" aria-label="فروشگاه جزوه" className={`inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-bold transition-all ${isActive(path, "/shop") ? "bg-royal text-white" : "bg-navy text-white hover:bg-navy-2"}`}>
              <Icon name="bag" className="size-4" strokeWidth={2} />
              <span className="hidden xl:inline">فروشگاه جزوه</span>
            </Link>
            <Link href="/register" className="btn-gold hidden px-4 py-2 text-sm xl:inline-flex">پیش‌ثبت‌نام</Link>
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
      <div
        id="mobile-menu"
        style={{ top }}
        className={`print:hidden lg:hidden fixed inset-x-0 bottom-0 z-40 transition-[opacity,visibility] duration-300 ${open ? "visible opacity-100" : "invisible opacity-0"}`}
      >
        <button type="button" aria-label="بستن منو" onClick={() => setOpen(false)} className="absolute inset-0 bg-navy/40 backdrop-blur-sm" />
        <div className={`relative max-h-full overflow-y-auto rounded-b-[1.75rem] bg-paper px-4 pt-3 pb-6 shadow-2xl transition-transform duration-300 ${open ? "translate-y-0" : "-translate-y-4"}`}>
          <nav aria-label="منوی موبایل" className="grid gap-1.5">
            {NAV.map((item) => {
              if (!item.children) {
                const on = item.href ? isActive(path, item.href) : false;
                return (
                  <Link key={item.label} href={item.href || "/"} className={`flex items-center gap-2.5 rounded-2xl border px-3.5 py-3 text-[0.95rem] font-bold ${item.highlight ? "border-[#e2c27a] bg-[#fff6df] text-[#8e342c]" : on ? "border-royal/30 bg-sky text-royal" : "border-line bg-ivory/60 text-navy"}`}>
                    <span className={`flex size-8 items-center justify-center rounded-xl ${on || item.highlight ? "bg-[#c9963e] text-[#3f2d1c]" : "bg-white text-royal ring-1 ring-line"}`}><Icon name={item.icon} className="size-[1.1rem]" /></span>
                    {item.label}
                  </Link>
                );
              }
              const expanded = acc === item.label;
              const on = entryOn(path, item);
              return (
                <div key={item.label} className="rounded-2xl border border-line bg-ivory/60">
                  <button
                    type="button"
                    aria-expanded={expanded}
                    className={`flex w-full items-center gap-2.5 px-3.5 py-3 text-[0.95rem] font-bold ${on ? "text-royal" : "text-navy"}`}
                    onClick={() => setAcc(expanded ? null : item.label)}
                  >
                    <span className="flex size-8 items-center justify-center rounded-xl bg-white text-royal ring-1 ring-line"><Icon name={item.icon} className="size-[1.1rem]" /></span>
                    <span className="flex-1 text-right">{item.label}</span>
                    <Chevron open={expanded} />
                  </button>
                  {expanded && (
                    <div className="grid gap-1 px-2 pb-2">
                      {item.children.map((child) => {
                        const childOn = isActive(path, child.href);
                        return (
                          <Link key={child.href} href={child.href} className={`flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-bold ${childOn ? "bg-sky text-royal" : "bg-white text-navy"}`}>
                            <Icon name={child.icon} className="size-4 text-royal" />
                            {child.label}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
          <Link href="/shop" className="bg-royal-panel mt-3 flex items-center justify-between gap-3 rounded-2xl p-4 text-white">
            <span className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-xl bg-white/15"><Icon name="bag" className="size-5" /></span>
              <span><b className="block">فروشگاه جزوه</b><span className="text-xs text-white/75">خرید آنلاین، تحویل حضوری با کد QR</span></span>
            </span>
            <Icon name="arrow" className="size-5" />
          </Link>
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
