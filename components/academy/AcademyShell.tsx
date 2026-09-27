import Link from "next/link";
import Image from "next/image";
import { resolveAcademySession } from "@/lib/academy/auth/session";
import { PUBLIC_SITE_ORIGIN } from "@/lib/registration/flows/public-url";

const navLinks = [
  { href: "/courses", label: "دوره‌ها" },
  { href: "/videos", label: "ویدئوها" },
  { href: "/support", label: "پشتیبانی" },
] as const;

export async function AcademyShell({
  children,
  activePath,
}: {
  children: React.ReactNode;
  activePath?: string;
}) {
  const session = await resolveAcademySession();

  return (
    <div className="academy-root" dir="rtl">
      <header className="academy-nav sticky top-0 z-40">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/images/brand/logo.png"
              alt="آکادمی ستارگان"
              width={120}
              height={40}
              className="h-9 w-auto object-contain"
            />
            <span className="hidden text-sm font-semibold text-primary sm:inline">
              آکادمی ستارگان
            </span>
          </Link>
          <nav className="hidden items-center gap-6 text-sm font-medium md:flex">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={
                  activePath === link.href
                    ? "text-secondary"
                    : "text-muted hover:text-primary"
                }
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            {session ? (
              <Link href="/account/library" className="academy-btn-primary text-sm">
                کتابخانه من
              </Link>
            ) : (
              <Link href="/login" className="academy-btn-primary text-sm">
                ورود
              </Link>
            )}
          </div>
        </div>
      </header>
      <main>{children}</main>
      <footer className="mt-16 border-t border-border bg-surface px-4 py-10">
        <div className="mx-auto grid max-w-6xl gap-8 text-sm md:grid-cols-3">
          <div>
            <p className="font-bold text-primary">آکادمی ستارگان</p>
            <p className="mt-2 text-muted leading-relaxed">
              یادگیری هدفمند با محتوای اختصاصی و تجربه تماشای امن روی موبایل و دسکتاپ.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <Link href="/courses" className="hover:text-secondary">
              دوره‌ها
            </Link>
            <Link href="/terms" className="hover:text-secondary">
              قوانین استفاده
            </Link>
            <Link href="/privacy" className="hover:text-secondary">
              حریم خصوصی
            </Link>
            <Link href="/support" className="hover:text-secondary">
              پشتیبانی
            </Link>
          </div>
          <div className="flex flex-col gap-2">
            <Link href="/login" className="hover:text-secondary">
              ورود
            </Link>
            <a href={`${PUBLIC_SITE_ORIGIN}/about`} className="hover:text-secondary">
              درباره ما
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
