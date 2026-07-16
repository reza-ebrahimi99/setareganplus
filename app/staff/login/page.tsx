import type { Metadata } from "next";
import Image from "next/image";
import { StaffOtpLoginForm } from "@/components/admin/StaffOtpLoginForm";
import { getAdminSession } from "@/lib/auth/require-admin";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "ورود همکاران",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

export default async function StaffLoginPage() {
  if (await getAdminSession()) redirect("/admin/workspace");
  return (
    <main className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,#f8fafc_0%,#eef2f7_100%)] px-4 py-10" dir="rtl">
      <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-[0_8px_24px_rgb(15_23_42_/_0.06)] sm:p-8">
        <div className="mb-6 text-center">
          <Image src="/images/brand/logo.png" alt="لوگوی ستارگان پلاس" width={140} height={48} className="mx-auto h-11 w-auto object-contain" priority />
          <h1 className="mt-4 text-xl font-bold text-primary">ورود همکاران مدرسه</h1>
          <p className="mt-2 text-sm text-muted">ورود با شماره موبایل و کد یک‌بارمصرف</p>
        </div>
        <StaffOtpLoginForm />
      </div>
    </main>
  );
}
