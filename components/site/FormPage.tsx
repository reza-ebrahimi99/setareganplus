import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublicForm } from "@/lib/forms/public";
import { getSettings } from "@/lib/settings";
import { fa, prettyPhone, telHref } from "@/lib/format";
import { FormRenderer } from "@/components/forms/FormRenderer";
import { Icon, PageHero, Star } from "./Star";

export async function FormPage({ slug, eyebrow }: { slug: string; eyebrow: string }) {
  const [form, { contact }] = await Promise.all([getPublicForm(slug), getSettings()]);
  if (!form) notFound();
  return (
    <>
      <PageHero eyebrow={eyebrow} title={form.title} text={form.description ?? undefined}>
        <ul className="mt-6 flex flex-wrap gap-2 text-sm">
          {["فرم کوتاه آنلاین", "بدون نیاز به ثبت‌نام در سایت", "تماس همکاران ما"].map((t) => (
            <li key={t} className="glass flex items-center gap-1.5 rounded-full px-3 py-1.5 text-white/85"><Icon name="check" className="size-4 text-gold" strokeWidth={2.4} />{t}</li>
          ))}
        </ul>
      </PageHero>
      <div className="container-x relative z-10 -mt-6 grid gap-6 pb-4 sm:-mt-8 lg:grid-cols-[1.45fr_0.55fr] lg:gap-8">
        <div className="card relative overflow-hidden !rounded-[1.75rem] p-5 shadow-[var(--shadow-lift)] sm:p-9">
          <span className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-l from-gold via-royal to-royal-2" />
          <FormRenderer form={form} />
        </div>
        <aside className="space-y-4 lg:sticky lg:top-28 lg:self-start">
          <div className="card p-6">
            <p className="flex items-center gap-2 font-black text-navy"><Star className="size-4 text-gold" />مراحل کار</p>
            <ol className="mt-4 space-y-3 text-sm">
              {["فرم را تکمیل و ارسال کنید", "درخواست شما ثبت می‌شود", "همکاران ما با شما تماس می‌گیرند"].map((t, i) => (
                <li key={t} className="flex items-center gap-3">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-sky text-xs font-black text-royal">{fa(i + 1)}</span>
                  <span className="text-ink/85">{t}</span>
                </li>
              ))}
            </ol>
          </div>
          {contact.phones.length > 0 && (
            <div className="bg-hero relative overflow-hidden rounded-[var(--radius-card)] p-6 text-white">
              <Star filled={false} className="pointer-events-none absolute -bottom-8 -left-8 size-36 text-white/10" />
              <p className="flex items-center gap-2 font-black"><Icon name="phone" className="size-5 text-gold" />ترجیح می‌دهید تماس بگیرید؟</p>
              <ul className="mt-4 grid grid-cols-2 gap-2">
                {contact.phones.map((p) => (
                  <li key={p}><a href={telHref(p)} dir="ltr" className="glass block rounded-xl px-2 py-2 text-center text-sm font-bold hover:bg-white/15">{prettyPhone(p)}</a></li>
                ))}
              </ul>
              {contact.hours.length > 0 && <ul className="mt-4 space-y-0.5 text-xs text-white/65">{contact.hours.map((h) => <li key={h}>{h}</li>)}</ul>}
            </div>
          )}
          <Link href="/shop" className="group card card-hover flex items-center gap-3 p-4">
            <span className="flex size-11 items-center justify-center rounded-2xl bg-gradient-to-br from-royal to-royal-2 text-white"><Icon name="bag" className="size-5" /></span>
            <span className="flex-1 text-sm"><b className="block text-navy">فروشگاه جزوه</b><span className="text-muted">خرید آنلاین جزوه‌های ستارگان</span></span>
            <Icon name="arrow" className="size-4 text-royal transition-transform group-hover:-translate-x-1" />
          </Link>
        </aside>
      </div>
    </>
  );
}
