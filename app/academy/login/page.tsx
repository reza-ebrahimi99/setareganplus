import Image from "next/image";
import { redirect } from "next/navigation";
import { AcademyLoginForm } from "@/app/academy/login/AcademyLoginForm";
import { AcademyHeroVisual } from "@/components/academy/AcademyHeroVisual";
import { resolveAcademySession } from "@/lib/academy/auth/session";
import { isSafeRelativePath } from "@/lib/guidance/office/relative-url";

export const metadata = {
  title: "ورود",
  robots: { index: false, follow: false },
};

type Props = { searchParams?: Promise<{ next?: string }> };

export default async function AcademyLoginPage({ searchParams }: Props) {
  const params = searchParams ? await searchParams : {};
  const next = isSafeRelativePath(params.next) ? params.next.trim() : "/account";

  const session = await resolveAcademySession();
  if (session) redirect(next);

  return (
    <main className="academy-root academy-login-page" dir="rtl">
      <div className="academy-login-visual">
        <div className="max-w-md">
          <span className="academy-hero-badge">آکادمی ستارگان</span>
          <h1 className="academy-hero-title mt-4">ورود امن با کد یک‌بارمصرف</h1>
          <p className="academy-hero-lead mt-3">
            پس از ورود به کتابخانه شخصی، دوره‌ها و ادامه تماشای جلسات دسترسی دارید.
          </p>
          <div className="mt-8 max-w-sm">
            <AcademyHeroVisual />
          </div>
        </div>
      </div>
      <div className="academy-login-panel">
        <div className="academy-card academy-login-card">
          <Image
            src="/images/brand/logo.png"
            alt="آکادمی ستارگان"
            width={140}
            height={48}
            className="mx-auto h-11 w-auto object-contain"
            priority
          />
          <h2 className="mt-6 text-center text-xl font-bold">ورود به آکادمی</h2>
          <p className="mt-2 text-center text-sm text-muted leading-relaxed">
            شماره موبایل خود را وارد کنید تا کد تأیید ارسال شود.
          </p>
          <div className="mt-8">
            <AcademyLoginForm next={next} />
          </div>
        </div>
      </div>
    </main>
  );
}
