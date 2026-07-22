import Link from "next/link";
import { PublicFormShell } from "@/components/forms/PublicFormShell";
import { qalamchiExamCatalog } from "@/lib/registration/catalogs/qalamchi-exam";
import { getPublicPageMetadata } from "@/lib/seo/public-pages";

export const metadata = getPublicPageMetadata("ghalamchiRegister");

export default function GhalamchiRegisterLandingPage() {
  return (
    <PublicFormShell>
      <section className="overflow-hidden rounded-3xl border border-border bg-surface shadow-[0_12px_40px_rgb(15_23_42_/_0.06)]">
        <div className="bg-gradient-to-l from-primary/10 via-white to-secondary/10 px-6 py-10 sm:px-10 sm:py-14">
          <p className="text-xs font-medium text-secondary">ثبت‌نام آنلاین</p>
          <h1 className="mt-3 text-2xl font-bold leading-10 text-primary sm:text-3xl">
            {qalamchiExamCatalog.title}
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-8 text-muted sm:text-base">
            {qalamchiExamCatalog.subtitle}
          </p>

          <ul className="mt-8 grid gap-3 text-sm text-foreground sm:grid-cols-3">
            {[
              "اطلاعات دانش‌آموز و ولی",
              "انتخاب آزمون، نوبت و بسته",
              "پرداخت و دریافت رسید",
            ].map((item) => (
              <li
                key={item}
                className="rounded-2xl border border-border/80 bg-white/80 px-4 py-3"
              >
                {item}
              </li>
            ))}
          </ul>

          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/ghalamchi/register/wizard"
              className="inline-flex min-h-12 items-center justify-center rounded-xl bg-primary px-6 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary/92"
            >
              شروع ثبت‌نام
            </Link>
            <Link
              href="/exams"
              className="inline-flex min-h-12 items-center justify-center rounded-xl border border-border bg-white px-6 text-sm font-medium text-foreground transition-colors hover:bg-background"
            >
              بازگشت به آزمون‌ها
            </Link>
          </div>
        </div>
      </section>
    </PublicFormShell>
  );
}
