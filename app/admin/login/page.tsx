import Image from "next/image";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { authenticate, createSession, getAdminUser, logLogin } from "@/lib/auth";
import { SubmitButton } from "@/components/admin/SubmitButton";

export const metadata: Metadata = { title: "ورود مدیر", robots: { index: false } };
export const dynamic = "force-dynamic";

// simple in-memory throttle
const fails = new Map<string, { n: number; t: number }>();

async function login(fd: FormData) {
  "use server";
  const username = String(fd.get("username") ?? "");
  const password = String(fd.get("password") ?? "");
  const key = username.toLowerCase();
  const f = fails.get(key);
  if (f && f.n >= 5 && Date.now() - f.t < 10 * 60_000) redirect("/admin/login?e=locked");
  const who = await authenticate(username, password);
  if (!who) {
    fails.set(key, { n: (f?.n ?? 0) + 1, t: Date.now() });
    await new Promise((r) => setTimeout(r, 600));
    redirect("/admin/login?e=1");
  }
  fails.delete(key);
  await createSession(who);
  await logLogin(who);
  redirect("/admin");
}

export default async function Login({ searchParams }: { searchParams: Promise<{ e?: string }> }) {
  if (await getAdminUser()) redirect("/admin");
  const { e } = await searchParams;
  return (
    <div className="flex min-h-dvh items-center justify-center bg-navy px-5">
      <form action={login} className="w-full max-w-sm rounded-3xl bg-paper p-8 shadow-2xl">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <Image src="/brand/logo.png" alt="" width={64} height={54} />
          <h1 className="text-xl font-extrabold text-navy">پنل مدیریت ستارگان</h1>
        </div>
        {e && <p className="mb-4 rounded-xl bg-gc-soft px-4 py-2.5 text-sm text-gc">{e === "locked" ? "ورود موقتاً مسدود است؛ ۱۰ دقیقه بعد تلاش کنید." : e === "out" ? "حساب شما غیرفعال شده یا رمز عبور تغییر کرده است؛ دوباره وارد شوید." : "نام کاربری یا رمز عبور نادرست است، یا حساب غیرفعال است."}</p>}
        <label className="label" htmlFor="username">نام کاربری</label>
        <input id="username" name="username" dir="ltr" autoComplete="username" required className="input mb-4" />
        <label className="label" htmlFor="password">رمز عبور</label>
        <input id="password" name="password" type="password" dir="ltr" autoComplete="current-password" required className="input mb-6" />
        <SubmitButton className="btn-gold w-full">ورود</SubmitButton>
      </form>
    </div>
  );
}
