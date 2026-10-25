import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublicForm } from "@/lib/forms/public";
import { getSettings } from "@/lib/settings";
import { fa, prettyPhone, telHref } from "@/lib/format";
import { isPaidMode } from "@/lib/forms/pricing";
import { Markdown } from "@/lib/markdown";
import { FormRenderer } from "@/components/forms/FormRenderer";
import { FormHero } from "@/components/forms/FormHero";
import { Icon, Star } from "./Star";
import { JsonLd } from "./JsonLd";
import { abs, breadcrumbLd } from "@/lib/ld";
import { mdToText } from "@/lib/markdown";

/** Structured data for a form page: breadcrumb + WebPage with a RegisterAction (no invented facts). */
export function formLd(form: { slug: string; title: string; description?: string | null; coverImage?: string | null; state?: string }) {
  const path = form.slug === "pre-registration" ? "/register" : `/f/${form.slug}`;
  const url = abs(path);
  return [
    breadcrumbLd([{ name: "ثبت‌نام‌ها", href: "/forms" }, { name: form.title }]),
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "@id": `${url}#webpage`,
      url,
      name: form.title,
      inLanguage: "fa-IR",
      ...(form.description ? { description: mdToText(form.description).slice(0, 300) } : {}),
      ...(form.coverImage ? { primaryImageOfPage: { "@type": "ImageObject", url: abs(form.coverImage) } } : {}),
      isPartOf: { "@id": `${abs("/")}#website` },
      ...(form.state === "open" ? { potentialAction: { "@type": "RegisterAction", target: url, name: form.title } } : {}),
    },
  ];
}

export async function FormPage({ slug, eyebrow }: { slug: string; eyebrow: string }) {
  const [form, { contact }] = await Promise.all([getPublicForm(slug), getSettings()]);
  if (!form) notFound();
  const paid = isPaidMode({ payMode: form.payMode ?? "FREE", basePriceRials: form.basePriceRials ?? 0 });
  const how = paid
    ? ["فرم را مرحله‌به‌مرحله تکمیل کنید", "هزینه را آنلاین با درگاه زیبال بپردازید", "رسید و کد پیگیری فوراً صادر می‌شود"]
    : ["فرم را تکمیل و ارسال کنید", "درخواست شما با کد پیگیری ثبت می‌شود", "همکاران ما با شما تماس می‌گیرند"];
  const longDesc = form.description && form.description.split(/\n\s*\n/).length > 1;
  return (
    <>
      <JsonLd data={formLd(form)} />
      <FormHero form={form} eyebrow={eyebrow} />
      <div className="container-x relative z-10 -mt-8 grid gap-6 pb-4 sm:-mt-10 lg:grid-cols-[1.45fr_0.55fr] lg:gap-8">
        <div className="card relative !rounded-[1.75rem] p-5 shadow-[var(--shadow-lift)] sm:p-9">
          <span className="absolute inset-x-6 top-0 h-1.5 rounded-b-full bg-gradient-to-l from-gold via-royal to-royal-2" />
          {longDesc && <Markdown text={form.description!} className="prose-fa mb-6 border-b border-line pb-6 text-[0.95rem] leading-8 text-ink/85" />}
          <FormRenderer form={form} />
        </div>
        <aside className="space-y-4 lg:sticky lg:top-28 lg:self-start">
          <div className="card p-6">
            <p className="flex items-center gap-2 font-black text-navy"><Star className="size-4 text-gold" />مراحل کار</p>
            <ol className="mt-4 space-y-3 text-sm">
              {how.map((t, i) => (
                <li key={t} className="flex items-center gap-3">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-sky text-xs font-black text-royal">{fa(i + 1)}</span>
                  <span className="text-ink/85">{t}</span>
                </li>
              ))}
            </ol>
            {paid && <p className="mt-4 rounded-xl bg-ivory px-3 py-2 text-xs leading-6 text-muted">پرداخت امن با درگاه رسمی زیبال؛ تا پرداخت تأیید نشود، ثبت‌نام «در انتظار پرداخت» می‌ماند.</p>}
          </div>
          {contact.phones.length > 0 && (
            <div className="bg-hero relative overflow-hidden rounded-[var(--radius-card)] p-6 text-white">
              <Star filled={false} className="pointer-events-none absolute -bottom-8 -left-8 size-36 text-white/10" />
              <p className="flex items-center gap-2 font-black"><Icon name="phone" className="size-5 text-gold" />سؤالی دارید؟ تماس بگیرید</p>
              <ul className="mt-4 grid grid-cols-2 gap-2">
                {contact.phones.map((p) => (
                  <li key={p}><a href={telHref(p)} dir="ltr" className="glass block rounded-xl px-2 py-2 text-center text-sm font-bold hover:bg-white/15">{prettyPhone(p)}</a></li>
                ))}
              </ul>
              {contact.hours.length > 0 && <ul className="mt-4 space-y-0.5 text-xs text-white/65">{contact.hours.map((h) => <li key={h}>{h}</li>)}</ul>}
            </div>
          )}
          <Link href="/forms" className="group card card-hover flex items-center gap-3 p-4">
            <span className="flex size-11 items-center justify-center rounded-2xl bg-gradient-to-br from-royal to-royal-2 text-white"><Icon name="check" className="size-5" /></span>
            <span className="flex-1 text-sm"><b className="block text-navy">ثبت‌نام‌های باز</b><span className="text-muted">کلاس‌ها، آزمون‌ها و مشاوره</span></span>
            <Icon name="arrow" className="size-4 text-royal transition-transform group-hover:-translate-x-1" />
          </Link>
        </aside>
      </div>
    </>
  );
}
