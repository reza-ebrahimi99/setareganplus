import Link from "next/link";
import type { PublicForm } from "@/lib/forms/public-types";
import { themeVars } from "@/lib/forms/themes";
import { priceBadge, capacityBadge, deadlineBadge } from "@/lib/forms/badges";
import { splitSteps } from "@/lib/forms/types";
import { fa, jalaliDate } from "@/lib/format";
import { mdToText } from "@/lib/markdown";

/** Cover hero of a form page; also used (compact) in the builder's live preview. */
export function FormHero({ form, eyebrow = "ثبت‌نام آنلاین", compact = false, crumbs = true }: { form: PublicForm; eyebrow?: string; compact?: boolean; crumbs?: boolean }) {
  const price = priceBadge(form);
  const cap = capacityBadge(form);
  const dl = deadlineBadge(form);
  const steps = splitSteps(form.fields).length;
  const summary = form.description ? mdToText(form.description.split(/\n\s*\n/)[0]).slice(0, 220) : null;
  return (
    <section data-form-hero className="relative isolate overflow-hidden text-white" style={themeVars(form.theme)}>
      {form.coverImage ? (
        <>
          <img src={form.coverImage} alt="" className="absolute inset-0 -z-20 size-full object-cover" fetchPriority="high" />
          <div className="absolute inset-0 -z-10 bg-[linear-gradient(to_top,var(--fh1)_8%,color-mix(in_oklab,var(--fh1)_70%,transparent)_45%,color-mix(in_oklab,var(--fh2)_35%,transparent))]" />
        </>
      ) : (
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(120%_120%_at_85%_0%,var(--fh2),var(--fh1)_60%)]">
          <div className="bg-dots absolute inset-0 opacity-60 [mask-image:radial-gradient(70%_80%_at_70%_20%,black,transparent)]" />
          <div className="absolute -top-24 left-[10%] size-72 rounded-full bg-gold/25 blur-3xl" />
        </div>
      )}
      <div className={`${compact ? "px-5 pt-6 pb-8" : "container-x pt-8 pb-14 sm:pt-12 sm:pb-20"} relative`}>
        {crumbs && !compact && (
          <nav aria-label="مسیر صفحه" className="mb-5 flex flex-wrap items-center gap-1.5 text-xs text-white/65">
            <Link href="/" className="hover:text-white">خانه</Link><span aria-hidden>‹</span>
            <Link href="/forms" className="hover:text-white">ثبت‌نام‌ها</Link><span aria-hidden>‹</span>
            <span className="text-white/90">{form.title}</span>
          </nav>
        )}
        <div className={`flex items-center gap-3 ${compact ? "" : "rise"}`}>
          {form.logo && <img src={form.logo} alt="" className={`${compact ? "size-10" : "size-14"} rounded-2xl bg-white object-contain p-1.5 shadow-lg`} />}
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/12 px-3 py-1 text-xs font-bold text-gold ring-1 ring-white/15 backdrop-blur">★ {eyebrow}</span>
        </div>
        <h1 className={`${compact ? "mt-3 text-2xl" : "rise rise-1 mt-4 text-3xl sm:text-5xl"} max-w-3xl leading-tight font-black text-balance`}>{form.title}</h1>
        {summary && <p className={`${compact ? "mt-2 text-sm" : "rise rise-2 mt-4 text-base sm:text-lg"} max-w-2xl leading-8 text-white/80`}>{summary}</p>}
        <ul className={`${compact ? "mt-4" : "rise rise-3 mt-6"} flex flex-wrap gap-2 text-sm`}>
          <li data-price-badge className={`rounded-full px-3.5 py-1.5 font-black shadow-sm ${price.free ? "bg-emerald-500 text-white" : "bg-gold text-navy"}`}>{price.text}</li>
          {cap && <li className={`rounded-full px-3.5 py-1.5 font-bold ring-1 ring-white/20 backdrop-blur ${form.state === "full" ? "bg-gc text-white" : "bg-white/12"}`} data-capacity>{cap}</li>}
          {dl && <li className="rounded-full bg-white/12 px-3.5 py-1.5 font-bold ring-1 ring-white/20 backdrop-blur">{dl}</li>}
          {form.closesAt && form.state !== "closed" && <li className="rounded-full bg-white/12 px-3.5 py-1.5 ring-1 ring-white/20 backdrop-blur">مهلت: {jalaliDate(form.closesAt)}</li>}
          {steps > 1 && <li className="rounded-full bg-white/12 px-3.5 py-1.5 ring-1 ring-white/20 backdrop-blur">{fa(steps)} مرحله</li>}
        </ul>
      </div>
    </section>
  );
}
