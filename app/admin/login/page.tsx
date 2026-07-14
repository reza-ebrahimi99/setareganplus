import type { Metadata } from "next";
import Image from "next/image";
import { AdminLoginForm } from "@/components/admin/AdminLoginForm";
import { redirectIfAuthenticated } from "@/app/admin/login/actions";
import { siteConfig } from "@/content/site";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "ورود مدیریت",
  robots: { index: false, follow: false },
};

type LoginPageProps = {
  searchParams: Promise<{ next?: string }>;
};

export default async function AdminLoginPage({ searchParams }: LoginPageProps) {
  await redirectIfAuthenticated();

  const params = await searchParams;
  const nextPath =
    typeof params.next === "string" && params.next.startsWith("/admin")
      ? params.next
      : undefined;

  return (
    <div className="flex min-h-full items-center justify-center bg-[linear-gradient(180deg,#f8fafc_0%,#eef2f7_100%)] px-4 py-10">
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
          <h1 className="mt-4 text-xl font-bold text-primary">ورود به پنل مدیریت</h1>
          <p className="mt-2 text-sm text-muted">{siteConfig.name}</p>
        </div>
        <AdminLoginForm nextPath={nextPath} />
      </div>
    </div>
  );
}
