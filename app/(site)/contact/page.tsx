import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";
import Link from "next/link";
import { getSettings } from "@/lib/settings";
import { prettyPhone, telHref } from "@/lib/format";
import { Icon, PageHero, SectionHead, Star } from "@/components/site/Star";
import { BranchList } from "@/components/site/BranchList";

export async function generateMetadata(): Promise<Metadata> {
  return pageMeta("contact");
}

export default async function Contact() {
  const { contact } = await getSettings();
  return (
    <>
      <PageHero eyebrow="تماس با ما" title="در کنار شما هستیم" text="برای مشاوره، ثبت‌نام و هر پرسشی با ما تماس بگیرید یا به یکی از شعبه‌ها سر بزنید." />
      <div className="container-x relative z-10 -mt-8">
        {contact.phones.length > 0 && (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {contact.phones.map((p) => {
              const mobile = p.startsWith("09");
              return (
                <a key={p} href={telHref(p)} className="group card card-hover flex flex-col items-start gap-3 p-4 sm:flex-row sm:items-center sm:gap-4 sm:p-5">
                  <span className={`flex size-11 shrink-0 items-center justify-center rounded-2xl text-white shadow-lg sm:size-12 ${mobile ? "bg-gradient-to-br from-[#16a37f] to-[#0e7a62]" : "bg-gradient-to-br from-royal to-royal-2"}`}>
                    <Icon name={mobile ? "chat" : "phone"} className="size-6" />
                  </span>
                  <span>
                    <span className="block text-xs font-semibold text-muted">{mobile ? "تلفن همراه" : "تلفن ثابت"}</span>
                    <span dir="ltr" className="block text-[1.02rem] font-black text-navy group-hover:text-royal sm:text-lg">{prettyPhone(p)}</span>
                  </span>
                </a>
              );
            })}
          </div>
        )}
      </div>
      <div className="container-x space-y-16 py-16">
        <section>
          <SectionHead eyebrow="نشانی" title={<>شعبه‌ها و <span className="text-gradient-blue">ساعات کاری</span></>} />
          <BranchList contact={contact} />
        </section>
        <section className="grid gap-4 md:grid-cols-2">
          {contact.social.length > 0 && (
            <div className="reveal card p-7">
              <p className="flex items-center gap-2 text-lg font-black text-navy"><Star className="size-4 text-gold" />ما را دنبال کنید</p>
              <p className="mt-1 text-sm text-muted">اخبار، برنامه‌ها و اطلاعیه‌ها در شبکه‌های اجتماعی</p>
              <div className="mt-5 flex flex-wrap gap-2">
                {contact.social.map((s) => (
                  <a key={s.url} href={s.url} target="_blank" rel="noopener noreferrer" className="btn-ghost px-5 py-2 text-sm">{s.label}</a>
                ))}
              </div>
            </div>
          )}
          <div className="reveal bg-hero relative flex flex-col justify-between gap-5 overflow-hidden rounded-[var(--radius-card)] p-7 text-white">
            <Star filled={false} className="pointer-events-none absolute -bottom-10 -left-10 size-48 text-white/10" />
            <div className="relative">
              <p className="text-lg font-black">پیش‌ثبت‌نام آنلاین</p>
              <p className="mt-1 text-sm text-white/70">فرم کوتاه را پر کنید تا همکاران ما با شما تماس بگیرند.</p>
            </div>
            <div className="relative flex flex-wrap gap-3">
              <Link href="/register" className="btn-gold">تکمیل فرم</Link>
              <Link href="/shop" className="btn-ghost-dark"><Icon name="bag" className="size-4" />فروشگاه جزوه</Link>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
