import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { s, b } from "@/lib/admin";
import { PageTitle, Panel, Area, Check, SaveBar, Flash } from "@/components/admin/ui";
import { getShopSettings, saveShopSettings } from "@/lib/shop/settings";
import { smsStatus } from "@/lib/shop/sms";
import { zibalConfigured } from "@/lib/shop/zibal";
import { normalizeIranMobile } from "@/lib/format";

export const metadata = { title: "تنظیمات فروشگاه" };
const KIND: Record<string, string> = { purchase: "پیامک خرید به خریدار", ready: "پیامک «آماده تحویل» به خریدار", admin: "پیامک سفارش جدید به مدیر" };

export default async function ShopSettingsPage({ searchParams }: { searchParams: Promise<{ ok?: string }> }) {
  const { ok } = await searchParams;
  const st = await getShopSettings();
  const sms = smsStatus();
  const zibal = zibalConfigured();

  async function save(fd: FormData) {
    "use server";
    await requireAdmin();
    const adminMobiles = [...new Set(s(fd, "adminMobiles").split(/[\s,،]+/).map((m) => normalizeIranMobile(m)).filter((m): m is string => !!m))];
    await saveShopSettings({ open: b(fd, "open"), notice: s(fd, "notice"), adminSms: b(fd, "adminSms"), adminMobiles });
    redirect("/admin/shop/settings?ok=1");
  }

  return (
    <>
      <PageTitle title="تنظیمات فروشگاه" sub="باز/بسته بودن فروش، پیام بالای فروشگاه و پیامک مدیر" />
      <Flash ok={ok} />
      <form action={save} className="space-y-6">
        <Panel title="فروش">
          <div className="space-y-4">
            <Check label="فروشگاه باز است و سفارش جدید می‌پذیرد" name="open" defaultChecked={st.open} />
            <Area label="پیام بالای فروشگاه" name="notice" defaultValue={st.notice} rows={2} hint="مثلاً زمان تحویل یا تعطیلی. خالی = بدون پیام." />
          </div>
        </Panel>
        <Panel title="پیامک مدیر">
          <div className="space-y-4">
            <Check label="برای هر سفارش پرداخت‌شده به مدیر پیامک بده" name="adminSms" defaultChecked={st.adminSms} />
            <Area label="شماره‌های مدیر" name="adminMobiles" defaultValue={st.adminMobiles.join("\n")} rows={3} dir="ltr" hint="هر شماره در یک خط" />
          </div>
        </Panel>
        <Panel title="وضعیت اتصال‌ها">
          <ul className="space-y-2 text-sm">
            <li className="flex justify-between"><span>درگاه پرداخت زیبال</span><b className={zibal ? "text-emerald-700" : "text-gc"}>{zibal ? "متصل" : "تنظیم نشده"}</b></li>
            {sms.map((x) => <li key={x.kind} className="flex justify-between"><span>{KIND[x.kind]}</span><b className={x.ok ? "text-emerald-700" : "text-gc"}>{x.ok ? "فعال" : x.why}</b></li>)}
          </ul>
          <p className="mt-3 text-xs text-muted">کلیدها روی سرور تنظیم می‌شوند (به‌روزرسانی خودکار آن‌ها را از سایت قبلی منتقل می‌کند).</p>
        </Panel>
        <SaveBar />
      </form>
    </>
  );
}
