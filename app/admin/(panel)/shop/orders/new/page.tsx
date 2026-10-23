import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { s, sn } from "@/lib/admin";
import { PageTitle, Panel, SaveBar } from "@/components/admin/ui";
import { GRADES, MAJORS, BRANCHES, PAY_METHOD, formatToman, isValidNationalCode } from "@/lib/shop/config";
import { createOrder, setStage, ShopError } from "@/lib/shop/orders";
import { normalizeIranMobile, toEn } from "@/lib/format";

export const metadata = { title: "سفارش دستی" };

export default async function NewOrder({ searchParams }: { searchParams: Promise<{ e?: string }> }) {
  const { e } = await searchParams;
  const products = await prisma.product.findMany({ where: { active: true }, orderBy: [{ sortOrder: "asc" }, { title: "asc" }] });

  async function create(fd: FormData) {
    "use server";
    await requireAdmin();
    const mobile = normalizeIranMobile(s(fd, "mobile"));
    const nc = toEn(s(fd, "nationalCode")).replace(/\D/g, "");
    const name = s(fd, "buyerName");
    const fail = (m: string) => redirect(`/admin/shop/orders/new?e=${encodeURIComponent(m)}`);
    if (name.length < 3) fail("نام خریدار را بنویسید.");
    if (!mobile) fail("شمارهٔ موبایل معتبر نیست.");
    if (nc && !isValidNationalCode(nc)) fail("کد ملی معتبر نیست.");
    let id = "";
    try {
      const o = await createOrder(
        s(fd, "product"),
        { buyerName: name, mobile: mobile!, nationalCode: nc || null, grade: sn(fd, "grade"), major: sn(fd, "major"), branch: s(fd, "branch") === "GIRLS" ? "GIRLS" : "BOYS", customerNote: sn(fd, "note") },
        { source: "admin", qty: Number(toEn(s(fd, "qty"))) || 1 },
      );
      id = o.id;
    } catch (err) {
      if (err instanceof ShopError) fail(err.message);
      throw err;
    }
    const pm = s(fd, "payMethod");
    if (pm && pm !== "UNPAID") await setStage([id], "PAID", { payMethod: pm });
    redirect(`/admin/shop/orders/${id}?ok=1`);
  }

  return (
    <>
      <PageTitle title="سفارش دستی" sub="برای خرید حضوری یا تلفنی؛ کد تحویل و رسید مثل سفارش آنلاین ساخته می‌شود." />
      {e && <div className="mb-5 rounded-xl border border-gc/30 bg-gc-soft px-4 py-3 text-sm font-semibold text-gc">{e}</div>}
      <form action={create}>
        <Panel>
          <div className="grid gap-5 md:grid-cols-2">
            <label className="block md:col-span-2"><span className="label">جزوه *</span>
              <select name="product" required className="input">{products.map((p) => <option key={p.id} value={p.id}>{p.title} — {formatToman(p.priceRials)}{p.stock !== null ? ` (موجودی ${p.stock})` : ""}</option>)}</select>
            </label>
            <label className="block"><span className="label">تعداد</span><input name="qty" type="number" min={1} max={10} defaultValue={1} className="input" /></label>
            <label className="block"><span className="label">پرداخت</span>
              <select name="payMethod" defaultValue="CASH" className="input">{Object.entries(PAY_METHOD).filter(([k]) => k !== "ONLINE").map(([k, l]) => <option key={k} value={k}>پرداخت شد — {l}</option>)}<option value="UNPAID">هنوز پرداخت نشده</option></select>
            </label>
            <label className="block"><span className="label">نام و نام خانوادگی *</span><input name="buyerName" required className="input" /></label>
            <label className="block"><span className="label">موبایل *</span><input name="mobile" required inputMode="tel" dir="ltr" placeholder="09…" className="input" /></label>
            <label className="block"><span className="label">کد ملی</span><input name="nationalCode" inputMode="numeric" dir="ltr" className="input" /></label>
            <label className="block"><span className="label">شعبهٔ تحویل</span><select name="branch" className="input">{Object.entries(BRANCHES).map(([k, b]) => <option key={k} value={k}>{b.short}</option>)}</select></label>
            <label className="block"><span className="label">پایه</span><select name="grade" className="input"><option value="">—</option>{GRADES.map((g) => <option key={g}>{g}</option>)}</select></label>
            <label className="block"><span className="label">رشته</span><select name="major" className="input"><option value="">—</option>{MAJORS.map((g) => <option key={g}>{g}</option>)}</select></label>
            <label className="block md:col-span-2"><span className="label">توضیح</span><input name="note" className="input" /></label>
          </div>
        </Panel>
        <SaveBar back="/admin/shop/orders" label="ثبت سفارش" />
      </form>
    </>
  );
}
