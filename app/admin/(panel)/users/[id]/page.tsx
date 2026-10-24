import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePerm, hashPassword, isOwnerUsername, logAction, type AdminUser } from "@/lib/auth";
import { PERM_LABEL } from "@/lib/perms";
import { USERNAME_RE, grantableBy, canManageUser, mergePerms } from "@/lib/staff";
import { normalizeIranMobile, toEn, jalaliDateTime } from "@/lib/format";
import { s } from "@/lib/admin";
import { PageTitle, Panel } from "@/components/admin/ui";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { PermPicker, PasswordField } from "@/components/admin/PermPicker";

export const metadata = { title: "همکار" };

const ERR: Record<string, string> = {
  name: "نام و نام خانوادگی را بنویسید.",
  username: "نام کاربری باید ۳ تا ۳۲ نویسهٔ انگلیسی کوچک، عدد، نقطه، خط تیره یا زیرخط باشد.",
  taken: "این نام کاربری قبلاً استفاده شده است.",
  password: "رمز عبور باید دست‌کم ۸ نویسه باشد.",
  mobile: "شمارهٔ موبایل معتبر نیست.",
  confirm: "برای حذف، تیک تأیید را بزنید.",
};
const OK: Record<string, string> = { saved: "✓ ذخیره شد.", reset: "✓ رمز تازه ثبت شد. همکار از همهٔ دستگاه‌ها خارج شد و باید با رمز جدید وارد شود.", off: "✓ حساب غیرفعال شد و همکار از پنل خارج شد.", on: "✓ حساب دوباره فعال شد." };

async function guard(id: string): Promise<{ me: AdminUser; u: NonNullable<Awaited<ReturnType<typeof prisma.staffUser.findUnique>>> }> {
  const me = await requirePerm("users.manage");
  const u = await prisma.staffUser.findUnique({ where: { id } });
  if (!u) redirect("/admin/users");
  if (!canManageUser(me, u)) redirect("/admin/forbidden?p=users.manage");
  return { me, u };
}

export default async function StaffEdit({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ e?: string; ok?: string }> }) {
  const me = await requirePerm("users.manage");
  const { id } = await params;
  const { e, ok } = await searchParams;
  const isNew = id === "new";
  const u = isNew ? null : await prisma.staffUser.findUnique({ where: { id } });
  if (!isNew && !u) notFound();
  if (u && !canManageUser(me, u)) redirect("/admin/forbidden?p=users.manage");
  const here = `/admin/users/${id}`;

  async function save(fd: FormData) {
    "use server";
    const me = await requirePerm("users.manage");
    const fullName = s(fd, "fullName");
    const mobileRaw = toEn(s(fd, "mobile"));
    const mobile = mobileRaw ? normalizeIranMobile(mobileRaw) : null;
    const submitted = fd.getAll("perms").map(String);
    const back = (k: string) => redirect(`${here}?e=${k}`);
    if (fullName.length < 2) back("name");
    if (mobileRaw && !mobile) back("mobile");
    if (isNew) {
      const username = toEn(s(fd, "username")).toLowerCase();
      const password = String(fd.get("password") ?? "");
      if (!USERNAME_RE.test(username) || isOwnerUsername(username)) back(isOwnerUsername(username) ? "taken" : "username");
      if (password.length < 8) back("password");
      if (await prisma.staffUser.findUnique({ where: { username } })) back("taken");
      const perms = mergePerms(me, [], submitted);
      const c = await prisma.staffUser.create({ data: { fullName, username, mobile, passwordHash: hashPassword(password), permissions: perms, createdBy: me.username } });
      await logAction(me, "users.create", `همکار جدید «${fullName}» (@${username}) — ${perms.map((p) => PERM_LABEL[p]).join("، ") || "بدون دسترسی"}`, c.id);
      redirect(`/admin/users?ok=created`);
    }
    const { u } = await guard(id);
    const perms = mergePerms(me, u.permissions, submitted);
    await prisma.staffUser.update({ where: { id }, data: { fullName, mobile, permissions: perms } });
    const added = perms.filter((p) => !u.permissions.includes(p)).map((p) => PERM_LABEL[p]);
    const removed = u.permissions.filter((p) => !(perms as string[]).includes(p)).map((p) => PERM_LABEL[p] ?? p);
    await logAction(me, "users.edit", `ویرایش «${fullName}»${added.length ? ` · افزوده: ${added.join("، ")}` : ""}${removed.length ? ` · برداشته: ${removed.join("، ")}` : ""}`, id);
    redirect(`${here}?ok=saved`);
  }
  async function resetPassword(fd: FormData) {
    "use server";
    const { me, u } = await guard(id);
    const password = String(fd.get("password") ?? "");
    if (password.length < 8) redirect(`${here}?e=password`);
    await prisma.staffUser.update({ where: { id }, data: { passwordHash: hashPassword(password), sessionVersion: { increment: 1 } } });
    await logAction(me, "users.reset", `بازنشانی رمز «${u.fullName}»`, id);
    redirect(`${here}?ok=reset`);
  }
  async function toggleActive() {
    "use server";
    const { me, u } = await guard(id);
    await prisma.staffUser.update({ where: { id }, data: { active: !u.active, sessionVersion: { increment: 1 } } });
    await logAction(me, "users.active", `${u.active ? "غیرفعال‌سازی" : "فعال‌سازی"} «${u.fullName}»`, id);
    redirect(`${here}?ok=${u.active ? "off" : "on"}`);
  }
  async function remove(fd: FormData) {
    "use server";
    const { me, u } = await guard(id);
    if (fd.get("confirm") !== "on") redirect(`${here}?e=confirm`);
    await prisma.staffUser.delete({ where: { id } });
    await logAction(me, "users.delete", `حذف همکار «${u.fullName}» (@${u.username})`, null);
    redirect("/admin/users?ok=deleted");
  }

  const grantable = grantableBy(me);
  const logs = u ? await prisma.adminLog.findMany({ where: { actor: `${u.fullName} (${u.username})` }, orderBy: { createdAt: "desc" }, take: 15 }) : [];

  return (
    <>
      <PageTitle
        title={isNew ? "همکار جدید" : u!.fullName}
        sub={isNew ? "نام کاربری و رمز بسازید و بخش‌های مجاز را تیک بزنید." : `@${u!.username} · ${u!.active ? "فعال" : "غیرفعال"}${u!.lastLoginAt ? ` · آخرین ورود ${jalaliDateTime(u!.lastLoginAt)}` : ""}`}
        action={<Link href="/admin/users" className="btn-ghost px-4 py-2 text-sm">← همه همکاران</Link>}
      />
      {e && ERR[e] && <div className="mb-5 rounded-xl border border-gc/30 bg-gc-soft px-4 py-3 text-sm font-semibold text-gc">{ERR[e]}</div>}
      {ok && OK[ok] && <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">{OK[ok]}</div>}

      <form action={save} className="space-y-6">
        <Panel title="مشخصات">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block"><span className="label">نام و نام خانوادگی *</span><input name="fullName" defaultValue={u?.fullName ?? ""} required className="input" /></label>
            <label className="block"><span className="label">موبایل (اختیاری)</span><input name="mobile" defaultValue={u?.mobile ?? ""} dir="ltr" inputMode="tel" placeholder="09xxxxxxxxx" className="input" /></label>
            {isNew ? (
              <>
                <label className="block"><span className="label">نام کاربری (انگلیسی) *</span><input name="username" required dir="ltr" autoComplete="off" pattern="[A-Za-z0-9._\-]{3,32}" placeholder="maryam.k" className="input font-mono" /></label>
                <PasswordField label="رمز عبور *" />
              </>
            ) : (
              <div className="sm:col-span-2 rounded-xl bg-ivory px-4 py-3 text-sm">نام کاربری: <b className="font-mono" dir="ltr">{u!.username}</b> <span className="text-muted">(قابل تغییر نیست)</span></div>
            )}
          </div>
        </Panel>
        <Panel title="دسترسی‌ها">
          <PermPicker initial={u?.permissions ?? []} grantable={grantable} />
        </Panel>
        <div className="sticky bottom-3 z-10 flex justify-end">
          <SubmitButton className="btn-gold px-8 py-3 shadow-lg">{isNew ? "ساخت حساب همکار" : "ذخیرهٔ تغییرات"}</SubmitButton>
        </div>
      </form>

      {u && (
        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          <Panel title="بازنشانی رمز">
            <form action={resetPassword} className="space-y-3">
              <PasswordField label="رمز جدید" />
              <SubmitButton className="btn-navy px-5 py-2 text-sm">ثبت رمز جدید</SubmitButton>
              <p className="text-xs leading-5 text-muted">همکار از همهٔ دستگاه‌ها خارج می‌شود.</p>
            </form>
          </Panel>
          <Panel title={u.active ? "غیرفعال کردن" : "فعال کردن"}>
            <p className="mb-3 text-sm leading-6 text-muted">{u.active ? "همکار فوراً از پنل خارج می‌شود و تا فعال‌سازی دوباره نمی‌تواند وارد شود. سوابقش حفظ می‌شود." : "همکار دوباره می‌تواند با همان نام کاربری و رمز وارد شود."}</p>
            <form action={toggleActive}><SubmitButton className={u.active ? "btn-ghost px-5 py-2 text-sm text-gc" : "btn-gold px-5 py-2 text-sm"}>{u.active ? "غیرفعال کن" : "فعال کن"}</SubmitButton></form>
          </Panel>
          <Panel title="حذف حساب">
            <form action={remove} className="space-y-3">
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="confirm" className="size-4 accent-gc" /> مطمئنم؛ این حساب حذف شود.</label>
              <SubmitButton className="rounded-xl border border-gc/40 px-5 py-2 text-sm font-bold text-gc hover:bg-gc-soft">حذف همکار</SubmitButton>
              <p className="text-xs leading-5 text-muted">سوابق کارهای انجام‌شده (تاریخچهٔ سفارش‌ها) با نام او باقی می‌ماند.</p>
            </form>
          </Panel>
          {logs.length > 0 && (
            <Panel title="آخرین فعالیت‌ها" className="lg:col-span-3">
              <ul className="divide-y divide-line text-sm">
                {logs.map((l) => <li key={l.id} className="flex justify-between gap-3 py-2"><span>{l.text}</span><span className="shrink-0 text-xs text-muted">{jalaliDateTime(l.createdAt)}</span></li>)}
              </ul>
            </Panel>
          )}
        </div>
      )}
    </>
  );
}
