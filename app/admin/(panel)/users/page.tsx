import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePerm } from "@/lib/auth";
import { PERM_LABEL, PRESETS } from "@/lib/perms";
import { fa, jalaliDateTime, prettyPhone } from "@/lib/format";
import { PageTitle, Panel, Empty } from "@/components/admin/ui";

export const metadata = { title: "همکاران" };

const OK: Record<string, string> = { created: "✓ همکار جدید ساخته شد.", saved: "✓ تغییرات ذخیره شد.", deleted: "✓ همکار حذف شد." };

function presetOf(perms: string[]) {
  return PRESETS.find((p) => p.perms.length === perms.length && p.perms.every((k) => perms.includes(k)))?.label;
}

export default async function Users({ searchParams }: { searchParams: Promise<{ ok?: string; tab?: string }> }) {
  const me = await requirePerm("users.manage");
  const { ok, tab } = await searchParams;
  const showLog = tab === "log" && me.owner;
  const [users, logs] = await Promise.all([
    prisma.staffUser.findMany({ orderBy: [{ active: "desc" }, { createdAt: "asc" }] }),
    showLog ? prisma.adminLog.findMany({ orderBy: { createdAt: "desc" }, take: 200 }) : [],
  ]);
  const activeCount = users.filter((u) => u.active).length;

  return (
    <>
      <PageTitle
        title="همکاران"
        sub={`${fa(users.length)} حساب · ${fa(activeCount)} فعال — هر همکار با نام کاربری و رمز خودش وارد می‌شود و فقط بخش‌های مجاز را می‌بیند.`}
        action={<Link href="/admin/users/new" className="btn-gold px-5 py-2.5 text-sm">+ همکار جدید</Link>}
      />
      {ok && OK[ok] && <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">{OK[ok]}</div>}

      {me.owner && (
        <div className="mb-4 flex gap-1.5">
          <Link href="/admin/users" className={`rounded-full border px-4 py-1.5 text-sm font-semibold ${!showLog ? "border-navy bg-navy text-white" : "border-line bg-paper hover:border-navy/30"}`}>حساب‌ها</Link>
          <Link href="/admin/users?tab=log" className={`rounded-full border px-4 py-1.5 text-sm font-semibold ${showLog ? "border-navy bg-navy text-white" : "border-line bg-paper hover:border-navy/30"}`}>گزارش فعالیت</Link>
        </div>
      )}

      {showLog ? (
        <Panel title="آخرین فعالیت‌ها (۲۰۰ مورد)">
          {logs.length === 0 ? <Empty>هنوز فعالیتی ثبت نشده.</Empty> : (
            <ul className="divide-y divide-line">
              {logs.map((l) => (
                <li key={l.id} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-2.5 text-sm">
                  <span><b className="text-navy">{l.actor}</b> — {l.text}{l.target && l.action.startsWith("order") && <> · <Link href={`/admin/shop/orders/${l.target}`} className="text-royal hover:underline">سفارش</Link></>}</span>
                  <span className="text-xs text-muted">{jalaliDateTime(l.createdAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      ) : (
        <>
          <div className="mb-4 rounded-2xl border border-line bg-paper p-4 text-sm">
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-xl bg-navy font-extrabold text-gold">★</span>
              <div className="min-w-0 flex-1"><p className="font-bold text-navy">مدیر اصلی</p><p className="text-xs text-muted">دسترسی کامل · نام کاربری و رمز در تنظیمات سرور</p></div>
              <span className="chip bg-gold/15 text-navy">همه بخش‌ها</span>
            </div>
          </div>
          {users.length === 0 ? (
            <Empty>هنوز همکاری اضافه نشده. با «+ همکار جدید» برای هر همکار نام کاربری و رمز بسازید.</Empty>
          ) : (
            <div className="grid gap-3">
              {users.map((u) => {
                const preset = presetOf(u.permissions);
                return (
                  <Link key={u.id} href={`/admin/users/${u.id}`} className={`group block rounded-2xl border bg-paper p-4 transition hover:border-royal/40 hover:shadow-md ${u.active ? "border-line" : "border-dashed border-line opacity-70"}`}>
                    <div className="flex flex-wrap items-center gap-3">
                      <span className={`flex size-10 shrink-0 items-center justify-center rounded-xl text-lg font-extrabold ${u.active ? "bg-sky text-royal" : "bg-line text-muted"}`}>{u.fullName.trim().charAt(0)}</span>
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-navy group-hover:text-royal">{u.fullName} <span className="font-mono text-xs font-normal text-muted" dir="ltr">@{u.username}</span></p>
                        <p className="text-xs text-muted">
                          {u.mobile && <><span dir="ltr">{prettyPhone(u.mobile)}</span> · </>}
                          {u.lastLoginAt ? `آخرین ورود ${jalaliDateTime(u.lastLoginAt)}` : "هنوز وارد نشده"}
                        </p>
                      </div>
                      <span className={`chip ${u.active ? "bg-emerald-50 text-emerald-700" : "bg-line text-muted"}`}>{u.active ? "فعال" : "غیرفعال"}</span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {preset && <span className="chip bg-royal text-white">{preset}</span>}
                      {u.permissions.map((p) => <span key={p} className="chip bg-ivory text-ink/80">{PERM_LABEL[p] ?? p}</span>)}
                      {u.permissions.length === 0 && <span className="text-xs text-muted">بدون دسترسی</span>}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </>
      )}
    </>
  );
}
