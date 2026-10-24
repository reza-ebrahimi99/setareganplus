import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin, verifyPassword, hashPassword, createSession, destroySession, logAction } from "@/lib/auth";
import { PERM_LABEL } from "@/lib/perms";
import { PageTitle, Panel } from "@/components/admin/ui";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { s } from "@/lib/admin";

export const metadata = { title: "حساب من" };

const MSG: Record<string, [boolean, string]> = {
  ok: [true, "✓ رمز عبور تغییر کرد. از این پس با رمز جدید وارد شوید."],
  cur: [false, "رمز فعلی درست نیست."],
  short: [false, "رمز جدید باید دست‌کم ۸ نویسه باشد."],
  match: [false, "رمز جدید و تکرار آن یکسان نیستند."],
};

export default async function Account({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  const me = await requireAdmin();
  const { m } = await searchParams;

  async function changePassword(fd: FormData) {
    "use server";
    const u = await requireAdmin();
    if (u.owner || !u.id) redirect("/admin/account");
    const st = await prisma.staffUser.findUnique({ where: { id: u.id } });
    if (!st) redirect("/admin/login");
    const next = s(fd, "next");
    if (!verifyPassword(String(fd.get("current") ?? ""), st.passwordHash)) redirect("/admin/account?m=cur");
    if (next.length < 8) redirect("/admin/account?m=short");
    if (next !== s(fd, "next2")) redirect("/admin/account?m=match");
    const upd = await prisma.staffUser.update({ where: { id: st.id }, data: { passwordHash: hashPassword(next), sessionVersion: { increment: 1 } } });
    await createSession({ u: upd.username, sid: upd.id, v: upd.sessionVersion }); // keep this device signed in, end all others
    await logAction(u, "account.password", "رمز عبور خود را تغییر داد");
    redirect("/admin/account?m=ok");
  }
  async function logout() {
    "use server";
    await destroySession();
    redirect("/admin/login");
  }

  const msg = m ? MSG[m] : null;
  return (
    <>
      <PageTitle title="حساب من" sub={me.owner ? "مدیر اصلی — دسترسی کامل" : `${me.name} · ${me.username}`} />
      {msg && <div className={`mb-5 rounded-xl border px-4 py-3 text-sm font-semibold ${msg[0] ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-gc/30 bg-gc-soft text-gc"}`}>{msg[1]}</div>}
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="تغییر رمز عبور">
          {me.owner ? (
            <p className="text-sm leading-7 text-muted">رمز مدیر اصلی در تنظیمات سرور (فایل ‎.env‎) نگهداری می‌شود و از این صفحه تغییر نمی‌کند. برای تغییر آن از دستور <code dir="ltr">npm run admin:hash</code> روی سرور استفاده کنید.</p>
          ) : (
            <form action={changePassword} className="space-y-4">
              <label className="block"><span className="label">رمز فعلی</span><input name="current" type="password" dir="ltr" autoComplete="current-password" required className="input" /></label>
              <label className="block"><span className="label">رمز جدید (دست‌کم ۸ نویسه)</span><input name="next" type="password" dir="ltr" autoComplete="new-password" minLength={8} required className="input" /></label>
              <label className="block"><span className="label">تکرار رمز جدید</span><input name="next2" type="password" dir="ltr" autoComplete="new-password" minLength={8} required className="input" /></label>
              <SubmitButton className="btn-gold px-6 py-2.5">ذخیرهٔ رمز جدید</SubmitButton>
              <p className="text-xs text-muted">پس از تغییر رمز، از همهٔ دستگاه‌های دیگر خارج می‌شوید.</p>
            </form>
          )}
        </Panel>
        <Panel title="دسترسی‌های شما">
          {me.owner ? <p className="text-sm text-muted">همهٔ بخش‌ها، از جمله مدیریت همکاران.</p> : (
            <div className="flex flex-wrap gap-2">
              {[...me.perms].map((p) => <span key={p} className="chip bg-sky text-royal">{PERM_LABEL[p] ?? p}</span>)}
              {me.perms.size === 0 && <span className="text-sm text-muted">هیچ دسترسی‌ای تعریف نشده.</span>}
            </div>
          )}
          <form action={logout} className="mt-6 border-t border-line pt-4"><button className="btn-ghost px-5 py-2 text-sm">خروج از پنل</button></form>
        </Panel>
      </div>
    </>
  );
}
