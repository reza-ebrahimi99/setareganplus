import type { Metadata } from "next";
import Link from "next/link";
import { getSettings } from "@/lib/settings";
import { prettyPhone, telHref } from "@/lib/format";
import { PageHero, Star } from "@/components/site/Star";
import { BranchList } from "@/components/site/BranchList";

export const metadata: Metadata = { title: "تماس با ما", description: "شماره‌های تماس، نشانی شعبه‌ها و ساعات کاری مؤسسه علمی ستارگان نسیم‌شهر." };

export default async function Contact() {
  const { contact } = await getSettings();
  return (
    <>
      <PageHero eyebrow="تماس با ما" title="در کنار شما هستیم" text="برای مشاوره، ثبت‌نام و هر پرسشی با ما تماس بگیرید یا به یکی از شعبه‌ها سر بزنید." />
      <div className="container-x space-y-10 py-12">
        <section>
          <h2 className="mb-5 flex items-center gap-2 text-xl font-extrabold text-navy"><Star className="size-4 text-gold" />شماره‌های تماس</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {contact.phones.map((p) => (
              <a key={p} href={telHref(p)} className="card flex items-center justify-between gap-3 p-5 transition-colors hover:border-navy/30">
                <span className="text-sm text-muted">{p.startsWith("09") ? "همراه" : "تلفن ثابت"}</span>
                <span dir="ltr" className="text-lg font-extrabold text-navy">{prettyPhone(p)}</span>
              </a>
            ))}
          </div>
        </section>
        <section>
          <h2 className="mb-5 flex items-center gap-2 text-xl font-extrabold text-navy"><Star className="size-4 text-gold" />شعبه‌ها و ساعات کاری</h2>
          <BranchList contact={contact} />
        </section>
        <section className="grid gap-4 md:grid-cols-2">
          <div className="card p-6">
            <p className="font-extrabold text-navy">شبکه‌های اجتماعی</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {contact.social.map((s) => (
                <a key={s.url} href={s.url} target="_blank" rel="noopener noreferrer" className="btn-ghost px-4 py-2 text-sm">{s.label}</a>
              ))}
            </div>
          </div>
          <div className="card flex flex-col justify-between gap-4 bg-navy p-6 text-white sm:flex-row sm:items-center">
            <p className="font-bold">برای پیش‌ثبت‌نام، فرم کوتاه را تکمیل کنید.</p>
            <Link href="/register" className="btn-gold">پیش‌ثبت‌نام</Link>
          </div>
        </section>
      </div>
    </>
  );
}
