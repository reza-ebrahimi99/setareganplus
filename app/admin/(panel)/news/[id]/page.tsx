import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { logAction, requirePerm } from "@/lib/auth";
import { s, sn, b, imageField } from "@/lib/admin";
import { fa, toEn } from "@/lib/format";
import { fromJalali, toJalali, J_MONTHS } from "@/lib/jalali";
import { NEWS_CATEGORIES, newsSlug } from "@/lib/news";
import { pingIndexNow } from "@/lib/indexnow";
import { PageTitle, Panel, Field, Area, Check, ImageInput, SaveBar } from "@/components/admin/ui";
import { SubmitButton } from "@/components/admin/SubmitButton";

export const metadata = { title: "ویرایش خبر" };

const ERR: Record<string, string> = {
  title: "عنوان را بنویسید.",
  slug: "این نشانی (slug) برای خبر دیگری استفاده شده است.",
  date: "تاریخ انتشار معتبر نیست.",
};

async function uniqueSlug(base: string, id: string | null) {
  let slug = base, i = 2;
  while (await prisma.news.findFirst({ where: { slug, ...(id ? { NOT: { id } } : {}) }, select: { id: true } })) slug = `${base}-${i++}`;
  return slug;
}

export default async function NewsEdit({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ e?: string; ok?: string }> }) {
  await requirePerm("content.news");
  const { id } = await params;
  const { e, ok } = await searchParams;
  const isNew = id === "new";
  const x = isNew ? null : await prisma.news.findUnique({ where: { id } });
  if (!isNew && !x) notFound();
  const [forms, products] = await Promise.all([
    prisma.form.findMany({ where: { status: "PUBLISHED" }, select: { slug: true, title: true }, orderBy: { title: "asc" } }),
    prisma.product.findMany({ where: { active: true }, select: { slug: true, title: true }, orderBy: { title: "asc" } }),
  ]);
  const when = x?.publishedAt ?? new Date();
  const j = toJalali(when);
  const hm = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Tehran", hour: "2-digit", minute: "2-digit", hour12: false }).format(when);

  async function save(fd: FormData) {
    "use server";
    const me = await requirePerm("content.news");
    const title = s(fd, "title");
    if (!title) redirect(`/admin/news/${id}?e=title`);
    const wanted = newsSlug(s(fd, "slug") || title);
    const slug = await uniqueSlug(wanted, isNew ? null : id);
    const jy = Number.parseInt(toEn(s(fd, "jy")), 10), jm = Number.parseInt(s(fd, "jm"), 10), jd = Number.parseInt(s(fd, "jd"), 10);
    const time = /^\d{1,2}:\d{2}$/.test(toEn(s(fd, "hm"))) ? toEn(s(fd, "hm")) : "09:00";
    const published = b(fd, "published");
    let publishedAt: Date | null = x?.publishedAt ?? null;
    if (jy > 1300 && jm >= 1 && jm <= 12 && jd >= 1 && jd <= 31) {
      const d = fromJalali(jy, jm, jd, time);
      if (Number.isNaN(d.getTime())) redirect(`/admin/news/${id}?e=date`);
      publishedAt = d;
    }
    if (published && !publishedAt) publishedAt = new Date();
    const formSlug = sn(fd, "formSlug"), productSlug = sn(fd, "productSlug");
    const data = {
      title, slug,
      summary: sn(fd, "summary")?.slice(0, 300) ?? null,
      body: s(fd, "body"),
      category: NEWS_CATEGORIES.some((c) => c.key === s(fd, "category")) ? s(fd, "category") : "ANNOUNCE",
      pinned: b(fd, "pinned"),
      published, publishedAt,
      formSlug, productSlug,
      cover: await imageField(fd, "cover", x?.cover ?? null, "news", 1600),
    };
    const saved = isNew ? await prisma.news.create({ data: { ...data, createdBy: me.name } }) : await prisma.news.update({ where: { id }, data });
    const verb = isNew ? "ایجاد" : !x!.published && published ? "انتشار" : "ویرایش";
    await logAction(me, isNew ? "news.create" : "news.edit", `${verb} خبر «${title}»${published ? "" : " (پیش‌نویس)"}`, saved.id);
    revalidatePath("/");
    revalidatePath("/news");
    if (published && saved.publishedAt && saved.publishedAt <= new Date()) pingIndexNow([`/news/${saved.slug}`, "/news"]);
    redirect(isNew ? `/admin/news/${saved.id}?ok=1` : "/admin/news?ok=1");
  }
  async function remove() {
    "use server";
    const me = await requirePerm("content.news");
    await prisma.news.delete({ where: { id } });
    await logAction(me, "news.delete", `حذف خبر «${x!.title}»`, null);
    revalidatePath("/");
    revalidatePath("/news");
    redirect("/admin/news?ok=1");
  }

  const sel = "input";
  return (
    <>
      <PageTitle title={isNew ? "خبر / اطلاعیه جدید" : x!.title} sub={isNew ? "پس از ذخیره می‌توانید منتشر یا پیش‌نویس نگه دارید." : `نشانی: /news/${x!.slug}`} />
      {e && <p className="mb-4 rounded-xl bg-gc/10 p-3 text-sm font-semibold text-gc">{ERR[e] ?? "خطا در ذخیره"}</p>}
      {ok && <p className="mb-4 rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">ذخیره شد.</p>}
      <form action={save} className="space-y-6">
        <Panel>
          <div className="grid gap-5 md:grid-cols-2">
            <div className="md:col-span-2"><Field label="عنوان" name="title" defaultValue={x?.title} required /></div>
            <Field label="نشانی (slug)" name="slug" defaultValue={x?.slug} dir="ltr" hint="خالی بگذارید تا از عنوان ساخته شود. مثلاً: azmoon-ghalamchi-aban" />
            <label className="block">
              <span className="label">دسته</span>
              <select name="category" defaultValue={x?.category ?? "ANNOUNCE"} className={sel}>
                {NEWS_CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
              </select>
            </label>
            <div className="md:col-span-2"><Area label="خلاصه (در فهرست و نتایج گوگل)" name="summary" defaultValue={x?.summary} rows={2} hint="یک یا دو جملهٔ کوتاه؛ حداکثر ۳۰۰ نویسه." /></div>
            <div className="md:col-span-2">
              <Area label="متن خبر" name="body" defaultValue={x?.body} rows={12} hint="خط خالی = پاراگراف جدید · «## » تیتر · «- » فهرست · **پررنگ** · [متن پیوند](https://...) — HTML پذیرفته نمی‌شود." />
            </div>
            <ImageInput label="تصویر کاور" name="cover" current={x?.cover} />
            <div className="space-y-4">
              <div>
                <span className="label">تاریخ انتشار (شمسی)</span>
                <div className="grid grid-cols-[1fr_1.4fr_1fr_1fr] gap-2" dir="rtl">
                  <select name="jd" defaultValue={j.jd} className={sel} aria-label="روز">{Array.from({ length: 31 }, (_, i) => <option key={i} value={i + 1}>{fa(i + 1)}</option>)}</select>
                  <select name="jm" defaultValue={j.jm} className={sel} aria-label="ماه">{J_MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}</select>
                  <input name="jy" defaultValue={fa(j.jy)} className={sel} aria-label="سال" inputMode="numeric" />
                  <input name="hm" defaultValue={hm} className={sel} aria-label="ساعت" dir="ltr" />
                </div>
                <span className="mt-1 block text-xs text-muted">اگر تاریخ آینده باشد، خبر در همان زمان خودکار نمایش داده می‌شود.</span>
              </div>
              <div className="flex flex-wrap gap-5">
                <Check label="منتشر شود" name="published" defaultChecked={x?.published ?? false} />
                <Check label="سنجاق در صفحهٔ اصلی" name="pinned" defaultChecked={x?.pinned} />
              </div>
            </div>
          </div>
        </Panel>
        <Panel title="دکمهٔ اقدام (اختیاری)">
          <div className="grid gap-5 md:grid-cols-2">
            <label className="block">
              <span className="label">پیوند به فرم</span>
              <select name="formSlug" defaultValue={x?.formSlug ?? ""} className={sel}>
                <option value="">— بدون فرم —</option>
                {forms.map((f) => <option key={f.slug} value={f.slug}>{f.title}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="label">پیوند به جزوه</span>
              <select name="productSlug" defaultValue={x?.productSlug ?? ""} className={sel}>
                <option value="">— بدون جزوه —</option>
                {products.map((p) => <option key={p.slug} value={p.slug}>{p.title}</option>)}
              </select>
            </label>
          </div>
        </Panel>
        <SaveBar back="/admin/news" />
      </form>
      {!isNew && (
        <form action={remove} className="mt-2">
          <SubmitButton className="text-sm font-semibold text-gc hover:underline" confirm="این خبر حذف شود؟">حذف این خبر</SubmitButton>
        </form>
      )}
    </>
  );
}
