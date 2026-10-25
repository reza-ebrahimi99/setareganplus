import type { Metadata } from "next";
import Link from "next/link";
import { pageMeta, pageText } from "@/lib/seo";
import { abs } from "@/lib/ld";
import { listedForms } from "@/lib/forms/public";
import { PageHero } from "@/components/site/Star";
import { JsonLd } from "@/components/site/JsonLd";
import { FormCard, formHref } from "@/components/forms/FormCard";
import { fa } from "@/lib/format";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return pageMeta("forms");
}

export default async function Forms() {
  const [t, forms] = await Promise.all([pageText("forms"), listedForms()]);
  const open = forms.filter((f) => f.state === "open");
  return (
    <>
      <JsonLd
        data={forms.length ? {
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: t.title,
          itemListElement: forms.map((f, i) => ({ "@type": "ListItem", position: i + 1, url: abs(formHref(f.slug)), name: f.title })),
        } : null}
      />
      <PageHero eyebrow="ثبت‌نام‌های آنلاین" title="ثبت‌نام‌های باز ستارگان" text={t.intro} crumbs="ثبت‌نام‌ها" />
      <section className="container-x py-12 sm:py-16">
        <h2 className="sr-only">فهرست فرم‌های ثبت‌نام</h2>
        <p className="text-sm text-muted">{fa(open.length)} ثبت‌نام باز{forms.length > open.length ? ` · ${fa(forms.length - open.length)} مورد به‌زودی یا تکمیل` : ""}</p>
        {forms.length === 0 ? (
          <div className="mt-6 rounded-3xl border border-dashed border-line bg-paper p-10 text-center">
            <p className="text-lg font-extrabold text-navy">فعلاً ثبت‌نام بازی نداریم.</p>
            <p className="mt-2 text-sm text-muted">می‌توانید <Link href="/register" className="font-bold text-royal">پیش‌ثبت‌نام</Link> کنید یا با ما <Link href="/contact" className="font-bold text-royal">تماس بگیرید</Link>.</p>
          </div>
        ) : (
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {forms.map((f, i) => <FormCard key={f.slug} f={f} priority={i < 3} />)}
          </div>
        )}
      </section>
    </>
  );
}
