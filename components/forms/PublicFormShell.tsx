import Image from "next/image";
import Link from "next/link";
import { siteConfig } from "@/content/site";

const SETAREGAN_LOGO_SRC = "/images/brand/logo.png";

type PublicFormShellProps = {
  children: React.ReactNode;
};

export function PublicFormShell({ children }: PublicFormShellProps) {
  return (
    <div className="flex min-h-full w-full min-w-0 flex-col overflow-x-hidden bg-[linear-gradient(180deg,#f8fafc_0%,#eef2f7_55%,#f8fafc_100%)]">
      <header className="border-b border-border/80 bg-white/90 backdrop-blur-sm">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Image
              src={SETAREGAN_LOGO_SRC}
              alt="لوگوی ستارگان پلاس"
              width={140}
              height={48}
              className="h-10 w-auto object-contain sm:h-11"
              priority
            />
            <div className="hidden min-w-0 sm:block">
              <p className="text-sm font-semibold text-primary">ستارگان پلاس</p>
              <p className="text-xs text-muted">فرم ثبت‌نام و رویداد</p>
            </div>
          </div>
          <Link
            href="/"
            className="text-xs font-medium text-muted transition-colors hover:text-primary sm:text-sm"
          >
            بازگشت به سایت
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full min-w-0 max-w-3xl flex-1 overflow-x-hidden px-4 py-8 sm:px-6 sm:py-10">
        {children}
      </main>

      <footer className="border-t border-border/70 bg-white/80">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-1 px-4 py-5 text-center text-xs leading-6 text-muted sm:px-6">
          <p>
            {siteConfig.name} · {siteConfig.nameEn}
          </p>
          <p>مرکز آموزشی نسیم‌شهر</p>
        </div>
      </footer>
    </div>
  );
}
