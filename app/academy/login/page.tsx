import Image from "next/image";
import { redirect } from "next/navigation";
import { AcademyLoginForm } from "@/app/academy/login/AcademyLoginForm";
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
    <main
      className="academy-root flex min-h-dvh items-center justify-center px-4 py-12"
      dir="rtl"
    >
      <div className="academy-card w-full max-w-md p-8">
        <Image
          src="/images/brand/logo.png"
          alt="آکادمی ستارگان"
          width={140}
          height={48}
          className="mx-auto h-11 w-auto object-contain"
          priority
        />
        <h1 className="mt-6 text-center text-xl font-bold text-primary">
          ورود به آکادمی ستارگان
        </h1>
        <p className="mt-2 text-center text-sm text-muted">
          ورود با شماره موبایل و کد یک‌بارمصرف
        </p>
        <div className="mt-8">
          <AcademyLoginForm next={next} />
        </div>
      </div>
    </main>
  );
}
