import Link from "next/link";
import Image from "next/image";

export const NAV: { href: string; label: string; wide?: boolean }[] = [
  { href: "/education", label: "آموزشگاه ستارگان" },
  { href: "/ghalamchi", label: "قلم‌چی نسیم‌شهر" },
  { href: "/achievements", label: "افتخارات" },
  { href: "/team", label: "تیم ما", wide: true },
  { href: "/gallery", label: "گالری", wide: true },
  { href: "/about", label: "درباره ما" },
  { href: "/contact", label: "تماس" },
];

export function Header() {
  return (
    <header className="print:hidden sticky top-0 z-40 border-b border-line/80 bg-ivory/90 backdrop-blur supports-[backdrop-filter]:bg-ivory/75">
      <div className="container-x flex h-16 items-center justify-between gap-4 sm:h-[4.5rem]">
        <Link href="/" className="flex items-center gap-2.5" aria-label="ستارگان پلاس — صفحه اصلی">
          <Image src="/brand/logo.png" alt="" width={44} height={37} priority className="h-9 w-auto" />
          <span className="leading-tight">
            <span className="block text-[1.05rem] font-extrabold text-navy">ستارگان پلاس</span>
            <span className="block text-[0.7rem] text-muted">مؤسسه علمی ستارگان · نسیم‌شهر</span>
          </span>
        </Link>
        <nav className="hidden items-center gap-1 lg:flex" aria-label="منوی اصلی">
          <Link href="/shop" className="ms-1 inline-flex items-center gap-1.5 rounded-full bg-navy px-3.5 py-2 text-[0.92rem] font-bold text-white shadow-sm shadow-navy/20 hover:bg-navy/90">
            <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 7h12l-1 13H7L6 7Z" strokeLinejoin="round" /><path d="M9 7a3 3 0 0 1 6 0" strokeLinecap="round" /></svg>
            فروشگاه جزوه
          </Link>
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className={`${n.wide ? "hidden xl:inline-flex" : ""} rounded-full px-3 py-2 text-[0.92rem] font-medium text-ink/80 hover:bg-navy/5 hover:text-navy`}>
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Link href="/shop" className="inline-flex items-center gap-1.5 rounded-full bg-navy px-3.5 py-2 text-sm font-bold text-white lg:hidden">
            <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 7h12l-1 13H7L6 7Z" strokeLinejoin="round" /><path d="M9 7a3 3 0 0 1 6 0" strokeLinecap="round" /></svg>
            <span>جزوه</span>
          </Link>
          <Link href="/register" className="btn-gold hidden px-5 py-2.5 text-sm sm:inline-flex">
            پیش‌ثبت‌نام
          </Link>
          <details className="group relative lg:hidden">
            <summary className="flex size-10 cursor-pointer list-none items-center justify-center rounded-full border border-line bg-paper [&::-webkit-details-marker]:hidden" aria-label="منو">
              <svg viewBox="0 0 24 24" className="size-5 text-navy group-open:hidden" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" /></svg>
              <svg viewBox="0 0 24 24" className="hidden size-5 text-navy group-open:block" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" /></svg>
            </summary>
            <div className="absolute left-0 mt-2 w-64 rounded-2xl border border-line bg-paper p-2 shadow-xl shadow-navy/10">
              <Link href="/shop" className="mb-1 flex items-center gap-2 rounded-xl bg-gold/15 px-4 py-2.5 font-bold text-navy"><svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 7h12l-1 13H7L6 7Z" strokeLinejoin="round" /><path d="M9 7a3 3 0 0 1 6 0" strokeLinecap="round" /></svg> فروشگاه جزوه</Link>
              <Link href="/" className="block rounded-xl px-4 py-2.5 font-medium hover:bg-ivory">خانه</Link>
              {NAV.map((n) => (
                <Link key={n.href} href={n.href} className="block rounded-xl px-4 py-2.5 font-medium hover:bg-ivory">
                  {n.label}
                </Link>
              ))}
              <Link href="/faq" className="block rounded-xl px-4 py-2.5 font-medium hover:bg-ivory">سؤالات متداول</Link>
              <Link href="/register" className="btn-gold mt-2 w-full">پیش‌ثبت‌نام</Link>
            </div>
          </details>
        </div>
      </div>
    </header>
  );
}
