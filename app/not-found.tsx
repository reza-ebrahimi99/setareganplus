import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { SiteShell } from "@/components/layout/SiteShell";

/**
 * Branded Persian 404. Next.js marks not-found responses as noindex by default.
 */
export default function NotFound() {
  return (
    <SiteShell>
      <section className="mx-auto flex w-full max-w-3xl flex-col items-center px-4 py-16 text-center sm:px-6 sm:py-24">
        <p className="text-sm font-medium tracking-wide text-secondary">۴۰۴</p>
        <h1 className="mt-3 text-2xl font-bold text-primary sm:text-3xl">
          صفحه موردنظر پیدا نشد
        </h1>
        <p className="mt-4 max-w-xl text-sm leading-8 text-muted sm:text-base">
          ممکن است آدرس تغییر کرده باشد یا به‌اشتباه وارد شده باشد. از لینک‌های
          زیر به بخش‌های اصلی سایت بروید.
        </p>

        <div className="mt-8 flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:flex-wrap sm:justify-center">
          <Button href="/" variant="primary">
            بازگشت به صفحه اصلی
          </Button>
          <Button href="/contact" variant="secondary">
            تماس با ما
          </Button>
          <Button href="/classes" variant="outline">
            مشاهده خدمات آموزشی
          </Button>
        </div>

        <ul className="mt-10 flex flex-wrap justify-center gap-x-4 gap-y-2 text-sm text-muted">
          <li>
            <Link
              href="/about"
              className="underline-offset-2 hover:text-primary hover:underline"
            >
              درباره ما
            </Link>
          </li>
          <li>
            <Link
              href="/pre-registration"
              className="underline-offset-2 hover:text-primary hover:underline"
            >
              پیش‌ثبت‌نام
            </Link>
          </li>
          <li>
            <Link
              href="/faq"
              className="underline-offset-2 hover:text-primary hover:underline"
            >
              سوالات متداول
            </Link>
          </li>
        </ul>
      </section>
    </SiteShell>
  );
}
