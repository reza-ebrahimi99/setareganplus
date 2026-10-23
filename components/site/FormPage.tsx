import { notFound } from "next/navigation";
import { getPublicForm } from "@/lib/forms/public";
import { getSettings } from "@/lib/settings";
import { prettyPhone, telHref } from "@/lib/format";
import { FormRenderer } from "@/components/forms/FormRenderer";
import { PageHero, Star } from "./Star";

export async function FormPage({ slug, eyebrow }: { slug: string; eyebrow: string }) {
  const [form, { contact }] = await Promise.all([getPublicForm(slug), getSettings()]);
  if (!form) notFound();
  return (
    <>
      <PageHero eyebrow={eyebrow} title={form.title} text={form.description ?? undefined} />
      <div className="container-x grid gap-8 py-12 lg:grid-cols-[1.4fr_0.6fr]">
        <div className="card p-5 sm:p-8">
          <FormRenderer form={form} />
        </div>
        <aside className="space-y-4">
          <div className="card p-6">
            <p className="flex items-center gap-2 font-extrabold text-navy"><Star className="size-4 text-gold" />ترجیح می‌دهید تماس بگیرید؟</p>
            <ul className="mt-3 space-y-1.5">
              {contact.phones.map((p) => <li key={p}><a href={telHref(p)} dir="ltr" className="font-semibold hover:text-edu">{prettyPhone(p)}</a></li>)}
            </ul>
            <ul className="mt-3 space-y-0.5 text-sm text-muted">{contact.hours.map((h) => <li key={h}>{h}</li>)}</ul>
          </div>
        </aside>
      </div>
    </>
  );
}
