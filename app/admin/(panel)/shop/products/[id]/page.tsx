import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePerm, logAction } from "@/lib/auth";
import { canSeeBookletRates } from "@/lib/shop/pricing-access";
import { bookletUnit } from "@/lib/shop/pricing";
import { getBookletPricing } from "@/lib/shop/pricing-db";
import { s, sn, b, n, imageField } from "@/lib/admin";
import { PageTitle, Panel, Field, Area, Check, ImageInput, SaveBar } from "@/components/admin/ui";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { GRADES, MAJORS, CENTERS, toman, formatToman } from "@/lib/shop/config";
import { fa, slugify, toEn } from "@/lib/format";
import { pingIndexNow } from "@/lib/indexnow";

const rials = (fd: FormData, k: string) => {
  const t = Number.parseInt(toEn(s(fd, k)).replace(/[^\d]/g, ""), 10);
  return Number.isFinite(t) && t > 0 ? t * 10 : null;
};

export default async function ProductEdit({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ e?: string; ok?: string }> }) {
  const me = await requirePerm("shop.products");
  const owner = canSeeBookletRates(me);
  const { id } = await params;
  const { e, ok } = await searchParams;
  const isNew = id === "new";
  const p = isNew ? null : await prisma.product.findUnique({ where: { id } });
  if (!isNew && !p) notFound();
  const orderCount = p ? await prisma.orderItem.count({ where: { productId: p.id } }) : 0;

  async function save(fd: FormData) {
    "use server";
    const me = await requirePerm("shop.products");
    const title = s(fd, "title");
    const price = rials(fd, "price");
    if (!title || !price) redirect(`/admin/shop/products/${id}?e=1`);
    const stockRaw = toEn(s(fd, "stock"));
    let slug = slugify(s(fd, "slug") || title) || `booklet-${Date.now().toString(36)}`;
    const clash = await prisma.product.findFirst({ where: { slug, NOT: { id: isNew ? "" : id } } });
    if (clash) slug = `${slug}-${Date.now().toString(36).slice(-4)}`;
    const data = {
      title,
      slug,
      author: sn(fd, "author"),
      summary: sn(fd, "summary"),
      description: sn(fd, "description"),
      priceRials: price,
      compareAtRials: rials(fd, "compareAt"),
      subject: sn(fd, "subject"),
      grade: sn(fd, "grade"),
      majors: fd.getAll("majors").map(String).filter((m) => (MAJORS as readonly string[]).includes(m)),
      center: sn(fd, "center"),
      pageCount: (() => {
        const raw = toEn(s(fd, "pageCount")).replace(/[^\d]/g, "");
        const pages = raw ? Number.parseInt(raw, 10) : 0;
        return pages > 0 ? pages : null;
      })(),
      isSpiral: b(fd, "isSpiral"),
      firstPageType: s(fd, "firstPageType") === "color" ? "color" : "bw",
      specs: sn(fd, "specs"),
      stock: stockRaw === "" ? null : Math.max(0, Number.parseInt(stockRaw, 10) || 0),
      active: b(fd, "active"),
      featured: b(fd, "featured"),
      sortOrder: n(fd, "sortOrder"),
      cover: await imageField(fd, "cover", p?.cover ?? null, "shop", 1000),
    };
    if (isNew) {
      const c = await prisma.product.create({ data });
      await logAction(me, "product.create", `جزوهٔ جدید «${title}» — ${price.toLocaleString("en")} ریال`, c.id);
      if (data.active) pingIndexNow([`/shop/${slug}`, "/shop"]);
      redirect(`/admin/shop/products/${c.id}?ok=1`);
    }
    await prisma.product.update({ where: { id }, data });
    await logAction(me, "product.edit", `ویرایش جزوهٔ «${title}»${p && p.priceRials !== price ? ` — قیمت ${p.priceRials.toLocaleString("en")} → ${price.toLocaleString("en")} ریال` : ""}`, id);
    if (data.active || p?.active) pingIndexNow([`/shop/${slug}`, "/shop"]);
    redirect(`/admin/shop/products/${id}?ok=1`);
  }
  async function remove() {
    "use server";
    const me = await requirePerm("shop.products");
    // Products with orders are only deactivated, never deleted (order history keeps its title anyway).
    const used = await prisma.orderItem.count({ where: { productId: id } });
    if (used) await prisma.product.update({ where: { id }, data: { active: false } });
    else await prisma.product.delete({ where: { id } });
    await logAction(me, "product.delete", `${used ? "غیرفعال‌سازی" : "حذف"} جزوهٔ «${p?.title ?? id}»`, id);
    redirect("/admin/shop/products?ok=1");
  }

  const rates = await getBookletPricing();
  const unit = p ? bookletUnit(p, rates) : null;
  return (
    <>
      <PageTitle
        title={isNew ? "جزوهٔ جدید" : p!.title}
        sub={isNew ? "اطلاعات جزوه را وارد کنید" : `${orderCount ? `${orderCount.toLocaleString("fa-IR")} سفارش` : "بدون سفارش"}`}
        action={p && <Link href={`/shop/${p.slug}`} target="_blank" className="btn-ghost px-4 py-2 text-sm">مشاهده در سایت ↗</Link>}
      />
      {e && <div className="mb-5 rounded-xl border border-gc/30 bg-gc-soft px-4 py-3 text-sm font-semibold text-gc">عنوان و قیمت الزامی است.</div>}
      {ok && <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">✓ ذخیره شد.</div>}
      <form action={save} className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-3">
          <Panel title="اطلاعات اصلی" className="lg:col-span-2">
            <div className="grid gap-5 md:grid-cols-2">
              <div className="md:col-span-2"><Field label="عنوان جزوه *" name="title" defaultValue={p?.title} required placeholder="مثلاً: جزوهٔ ریاضی یازدهم" /></div>
              <Field label="مدرس / مؤلف" name="author" defaultValue={p?.author} />
              <Field label="درس" name="subject" defaultValue={p?.subject} placeholder="ریاضی، شیمی، …" />
              <div className="md:col-span-2"><Field label="خلاصه (یک خط، روی کارت)" name="summary" defaultValue={p?.summary} /></div>
              <div className="md:col-span-2"><Area label="توضیحات کامل" name="description" defaultValue={p?.description} rows={6} /></div>
              <div className="md:col-span-2"><Area label="مشخصات (هر خط «عنوان: مقدار»)" name="specs" defaultValue={p?.specs} rows={4} hint="مثلاً: نوع چاپ: سیاه‌وسفید — صحافی: فنری — قطع: A4" /></div>
              <Field label="تعداد صفحات" name="pageCount" type="number" defaultValue={p?.pageCount} />
              <div className="md:col-span-2 space-y-3">
                <Check label="سیمی هست؟" name="isSpiral" defaultChecked={p?.isSpiral ?? false} />
                <fieldset>
                  <legend className="label">صفحه اول</legend>
                  <div className="flex flex-wrap gap-4 text-sm font-semibold">
                    <label className="inline-flex items-center gap-2"><input type="radio" name="firstPageType" value="bw" defaultChecked={(p?.firstPageType ?? "bw") !== "color"} className="accent-navy" />سیاه‌وسفید</label>
                    <label className="inline-flex items-center gap-2"><input type="radio" name="firstPageType" value="color" defaultChecked={p?.firstPageType === "color"} className="accent-navy" />رنگی</label>
                  </div>
                </fieldset>
              </div>
              <Field label="نشانی در سایت (اختیاری)" name="slug" defaultValue={p?.slug} dir="ltr" hint="اگر خالی بماند از عنوان ساخته می‌شود." />
            </div>
          </Panel>
          <div className="space-y-6">
            <Panel title="قیمت و موجودی">
              <div className="space-y-4">
                {unit && <p className="rounded-xl bg-ivory px-4 py-3 text-sm font-extrabold text-navy">قیمت فروش: {formatToman(unit.unitRials)}</p>}
                {owner && unit?.auto && unit.sheets && (
                  <dl className="space-y-1 rounded-xl border border-line px-4 py-3 text-sm">
                    <div className="flex justify-between gap-3"><dt>برگه‌ها</dt><dd>{fa(unit.sheets)}</dd></div>
                    <div className="flex justify-between gap-3"><dt>هر برگه A4</dt><dd>{formatToman((unit.sheetToman / unit.sheets) * 10)}</dd></div>
                    <div className="flex justify-between gap-3"><dt>جمع برگه‌ها</dt><dd>{formatToman(unit.sheetToman * 10)}</dd></div>
                    <div className="flex justify-between gap-3"><dt>سیمی</dt><dd>{formatToman(unit.spiralToman * 10)}</dd></div>
                    <div className="flex justify-between gap-3"><dt>صفحه اول</dt><dd>{formatToman(unit.coverToman * 10)}</dd></div>
                    <div className="flex justify-between gap-3"><dt>حمل از چاپخانه</dt><dd>{formatToman(unit.shippingToman * 10)}</dd></div>
                  </dl>
                )}
                <Field label="قیمت (تومان) *" name="price" defaultValue={p ? toman(p.priceRials) : ""} required dir="ltr" hint={owner ? "اگر نرخ چاپ و تعداد صفحه هر دو پر باشد، فروش از فرمول حساب می‌شود و این مبلغ ذخیرهٔ پشتیبان است." : "به تومان وارد کنید."} />
                <Field label="قیمت قبل از تخفیف (تومان)" name="compareAt" defaultValue={p?.compareAtRials ? toman(p.compareAtRials) : ""} dir="ltr" hint="اختیاری؛ خط‌خورده نمایش داده می‌شود." />
                <Field label="موجودی" name="stock" defaultValue={p?.stock ?? ""} dir="ltr" hint="خالی = نامحدود · ۰ = ناموجود" />
              </div>
            </Panel>
            <Panel title="جلد">
              <ImageInput label="تصویر جلد" name="cover" current={p?.cover} />
            </Panel>
            <Panel title="نمایش">
              <div className="space-y-4">
                <div className="flex flex-col gap-3"><Check label="فعال (قابل سفارش)" name="active" defaultChecked={p?.active ?? true} /><Check label="ویژه (نمایش در صفحهٔ اصلی)" name="featured" defaultChecked={p?.featured} /></div>
                <Field label="ترتیب نمایش" name="sortOrder" type="number" defaultValue={p?.sortOrder ?? 0} hint="عدد کوچک‌تر = بالاتر" />
              </div>
            </Panel>
          </div>
        </div>
        <Panel title="مخاطب">
          <div className="grid gap-5 md:grid-cols-3">
            <label className="block"><span className="label">پایه</span>
              <select name="grade" defaultValue={p?.grade ?? ""} className="input"><option value="">همهٔ پایه‌ها</option>{GRADES.map((g) => <option key={g}>{g}</option>)}</select>
            </label>
            <label className="block"><span className="label">مرکز</span>
              <select name="center" defaultValue={p?.center ?? ""} className="input"><option value="">هر دو مرکز</option>{Object.entries(CENTERS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
            </label>
            <div><span className="label">رشته (خالی = همهٔ رشته‌ها)</span>
              <div className="flex flex-wrap gap-2">
                {MAJORS.map((m) => (
                  <label key={m} className="cursor-pointer"><input type="checkbox" name="majors" value={m} defaultChecked={p?.majors.includes(m)} className="peer sr-only" /><span className="chip peer-checked:border-navy peer-checked:bg-navy peer-checked:text-white">{m}</span></label>
                ))}
              </div>
            </div>
          </div>
        </Panel>
        <SaveBar back="/admin/shop/products" />
      </form>
      {!isNew && (
        <form action={remove} className="mt-2">
          <SubmitButton className="text-sm font-semibold text-gc hover:underline" confirm={orderCount ? "این جزوه سفارش دارد؛ فقط غیرفعال می‌شود. ادامه؟" : "این جزوه حذف شود؟"}>{orderCount ? "غیرفعال کردن" : "حذف این جزوه"}</SubmitButton>
        </form>
      )}
    </>
  );
}
