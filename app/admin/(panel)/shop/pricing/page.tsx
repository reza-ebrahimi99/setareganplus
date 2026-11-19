import { redirect } from "next/navigation";
import { requireAdmin, logAction } from "@/lib/auth";
import { s } from "@/lib/admin";
import { PageTitle, Panel, Field, SaveBar, Flash } from "@/components/admin/ui";
import { toEn } from "@/lib/format";
import { pricingStatus } from "@/lib/shop/pricing-access";
import { getBookletPricing, saveBookletPricing } from "@/lib/shop/pricing-db";

export const metadata = { title: "قیمت‌گذاری جزوه" };
export const dynamic = "force-dynamic";

const tomanOf = (fd: FormData, key: string) => {
  const n = Number.parseInt(toEn(s(fd, key)).replace(/[^\d]/g, ""), 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
};

const percentOf = (fd: FormData) => {
  const n = Number.parseFloat(toEn(s(fd, "vatPercent")).replace(/[^\d.]/g, ""));
  return Number.isFinite(n) ? n : 0;
};

export default async function BookletPricingPage({ searchParams }: { searchParams: Promise<{ ok?: string }> }) {
  const me = await requireAdmin();
  if (pricingStatus(me) === 403) redirect("/admin/forbidden");
  const { ok } = await searchParams;
  const rates = await getBookletPricing();

  async function save(fd: FormData) {
    "use server";
    const who = await requireAdmin();
    if (pricingStatus(who) === 403) redirect("/admin/forbidden");
    await saveBookletPricing({
      sheetToman: tomanOf(fd, "sheetToman"),
      spiralToman: tomanOf(fd, "spiralToman"),
      colorFirstToman: tomanOf(fd, "colorFirstToman"),
      bwFirstToman: tomanOf(fd, "bwFirstToman"),
      shippingToman: tomanOf(fd, "shippingToman"),
      vatPercent: percentOf(fd),
    });
    await logAction(who, "shop.pricing", "نرخ چاپ جزوه ذخیره شد");
    redirect("/admin/shop/pricing?ok=1");
  }

  return (
    <>
      <PageTitle title="قیمت‌گذاری جزوه" sub="این نرخ‌ها فقط برای مدیر اصلی است و در سایت یا برای همکاران نشان داده نمی‌شود" />
      <Flash ok={ok} />
      <form action={save} className="space-y-6">
        <Panel title="نرخ چاپ">
          <div className="grid gap-5 md:grid-cols-2">
            <Field label="قیمت هر برگه A4 (تومان)" name="sheetToman" defaultValue={rates.sheetToman || ""} dir="ltr" hint="چاپ دو رو است: هر برگه دو صفحه است." />
            <Field label="هزینه سیمی (تومان)" name="spiralToman" defaultValue={rates.spiralToman || ""} dir="ltr" hint="فقط برای جزوه‌ای که سیمی باشد، یک بار." />
            <Field label="قیمت صفحه اول رنگی (تومان)" name="colorFirstToman" defaultValue={rates.colorFirstToman || ""} dir="ltr" />
            <Field label="قیمت صفحه اول سیاه‌وسفید (تومان)" name="bwFirstToman" defaultValue={rates.bwFirstToman || ""} dir="ltr" />
            <Field label="هزینه حمل از چاپخانه (هر جزوه)" name="shippingToman" defaultValue={rates.shippingToman || ""} dir="ltr" hint="روی قیمت هر جزوه اضافه می‌شود" />
          </div>
        </Panel>
        <Panel title="سفارش">
          <div className="grid gap-5 md:grid-cols-2">
            <Field label="درصد مالیات بر ارزش افزوده" name="vatPercent" defaultValue={rates.vatPercent} dir="ltr" hint="از ۰ تا ۱۰۰. روی مبلغ سفارش حساب می‌شود و جدا نشان داده نمی‌شود. صفر یعنی بدون مالیات." />
          </div>
          <p className="mt-4 text-xs leading-6 text-muted">تا وقتی هر چهار نرخ چاپ صفر باشد، یا جزوه تعداد صفحه نداشته باشد، همان قیمت ذخیره‌شدهٔ جزوه می‌ماند. سفارش‌های قبلی عوض نمی‌شوند. خریدار و همکار فقط مبلغ نهایی را می‌بینند.</p>
        </Panel>
        <SaveBar back="/admin/shop" />
      </form>
    </>
  );
}
