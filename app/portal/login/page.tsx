import type { Metadata } from "next";
import Image from "next/image";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { PortalLoginForm } from "@/app/portal/login/PortalLoginForm";
import { isSafeRelativePath } from "@/lib/guidance/office/relative-url";
import { GUIDANCE_PLATFORM_HOME } from "@/lib/guidance/portal-nav";
import { resolvePortalHubPath } from "@/lib/guidance/student-entry";
import { resolvePortalContext } from "@/lib/portal/auth";

export const metadata: Metadata = {
  title: "ورود پرتال",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

type PortalLoginPageProps = {
  searchParams?: Promise<{ next?: string }>;
};

function isGuidanceLoginIntent(next: string | undefined): boolean {
  if (!next) return false;
  return (
    next === GUIDANCE_PLATFORM_HOME ||
    next.startsWith(`${GUIDANCE_PLATFORM_HOME}?`) ||
    next.startsWith(`${GUIDANCE_PLATFORM_HOME}/`)
  );
}

export default async function PortalLoginPage({
  searchParams,
}: PortalLoginPageProps) {
  const params = searchParams ? await searchParams : {};
  const next = isSafeRelativePath(params.next) ? params.next.trim() : undefined;
  const guidanceIntent = isGuidanceLoginIntent(next);

  const context = await resolvePortalContext();
  if (context) {
    const host = (await headers()).get("host");
    if (next) {
      redirect(next);
    }
    redirect(await resolvePortalHubPath(context, { host }));
  }

  return (
    <main
      className="flex min-h-dvh items-start justify-center bg-[linear-gradient(180deg,#f8fafc_0%,#eef2f7_100%)] px-4 pb-16 pt-10 sm:items-center sm:py-10"
      dir="rtl"
    >
      <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-[0_8px_24px_rgb(15_23_42_/_0.06)] sm:p-8">
        <div className="mb-6 text-center">
          <Image
            src="/images/brand/logo.png"
            alt="لوگوی ستارگان پلاس"
            width={140}
            height={48}
            className="mx-auto h-11 w-auto object-contain"
            priority
          />
          <h1 className="mt-4 text-xl font-bold text-primary">
            {guidanceIntent
              ? "ورود به سامانه انتخاب رشته"
              : "پرتال دانش‌آموز و والدین"}
          </h1>
          <p className="mt-2 text-sm text-muted">
            {guidanceIntent
              ? "ورود با شماره موبایل و کد یک‌بارمصرف — پس از تأیید، به داشبورد انتخاب رشته هدایت می‌شوید."
              : "ورود با شماره موبایل و کد یک‌بارمصرف — دانش‌آموزان فعلی و داوطلبان جدید"}
          </p>
        </div>
        <PortalLoginForm next={next} />
      </div>
    </main>
  );
}
