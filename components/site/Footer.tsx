import Link from "next/link";
import Image from "next/image";
import type { ContactSettings } from "@/lib/settings";
import { prettyPhone, telHref } from "@/lib/format";
import { Star } from "./Star";

export function Footer({ contact }: { contact: ContactSettings }) {
  const year = new Intl.DateTimeFormat("fa-IR-u-ca-persian", { year: "numeric" }).format(new Date());
  return (
    <footer className="print:hidden relative mt-20 overflow-hidden bg-navy text-white/80">
      <Star filled={false} className="pointer-events-none absolute -bottom-24 -right-16 size-96 text-white/5" />
      <div className="container-x relative grid gap-10 py-14 md:grid-cols-[1.3fr_1fr_1fr]">
        <div>
          <div className="flex items-center gap-3">
            <span className="flex size-12 items-center justify-center rounded-2xl bg-white">
              <Image src="/brand/logo.png" alt="" width={36} height={30} />
            </span>
            <div>
              <p className="text-lg font-extrabold text-white">مؤسسه علمی ستارگان</p>
              <p className="text-sm text-white/60">چون تو لایق بهترینی...</p>
            </div>
          </div>
          <ul className="mt-6 space-y-2 text-sm">
            <li className="flex items-center gap-2"><span className="size-2 rounded-full bg-edu" /> <Link href="/education" className="hover:text-white">آموزشگاه تقویتی و کنکور ستارگان</Link></li>
            <li className="flex items-center gap-2"><span className="size-2 rounded-full bg-gc" /> <Link href="/ghalamchi" className="hover:text-white">نمایندگی قلم‌چی نسیم‌شهر</Link></li>
          </ul>
          <div className="mt-6 flex flex-wrap gap-2">
            {contact.social.map((s) => (
              <a key={s.url} href={s.url} target="_blank" rel="noopener noreferrer" className="rounded-full border border-white/15 px-3.5 py-1.5 text-sm hover:bg-white/10">
                {s.label}
              </a>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-4 font-bold text-white">نشانی شعبه‌ها</p>
          <ul className="space-y-4 text-sm leading-7">
            {contact.branches.map((b) => (
              <li key={b.name}>
                <span className="font-semibold text-white">{b.name}: </span>
                {b.address}
                {b.mapUrl && (
                  <a href={b.mapUrl} target="_blank" rel="noopener noreferrer" className="mr-2 text-gold hover:underline">نقشه</a>
                )}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="mb-4 font-bold text-white">تماس</p>
          <ul className="space-y-1.5 text-sm" dir="ltr">
            {contact.phones.map((p) => (
              <li key={p} className="text-right"><a href={telHref(p)} className="hover:text-white">{prettyPhone(p)}</a></li>
            ))}
          </ul>
          <ul className="mt-4 space-y-1 text-sm">
            {contact.hours.map((h) => <li key={h}>{h}</li>)}
          </ul>
          {contact.enamadUrl && (
            <a href={contact.enamadUrl} target="_blank" rel="noopener noreferrer" referrerPolicy="origin" className="mt-5 inline-block text-xs text-white/50 hover:text-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={contact.enamadUrl.replace("trustseal.enamad.ir/?", "trustseal.enamad.ir/logo.aspx?")}
                alt="نماد اعتماد الکترونیکی"
                referrerPolicy="origin"
                className="h-20 w-auto rounded-lg bg-white p-1"
              />
            </a>
          )}
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="container-x flex flex-col gap-2 py-5 text-xs text-white/50 sm:flex-row sm:justify-between">
          <span>© {year} مؤسسه علمی ستارگان — نسیم‌شهر</span>
          <span className="flex gap-4">
            <Link href="/faq" className="hover:text-white">سؤالات متداول</Link>
            <Link href="/register" className="hover:text-white">پیش‌ثبت‌نام</Link>
          </span>
        </div>
      </div>
    </footer>
  );
}
