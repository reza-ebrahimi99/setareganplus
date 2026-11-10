import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePerm } from "@/lib/auth";
import { PageTitle, Panel, Field, Area, Check, Flash } from "@/components/admin/ui";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { FIELDS, GRADES } from "@/lib/classes/catalog";
import { saveCourse, addLesson, saveFile, manualEnroll, saveChapters, setLessonPremium } from "../actions";
import { readChapterCatalog } from "@/lib/classes/bank-sync";

export default async function EditCourse({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; e?: string }> }) {
  await requirePerm("classes.manage");
  const { id } = await params;
  const sp = await searchParams;
  const [course, products, catalog] = await Promise.all([
    prisma.classCourse.findUnique({ where: { id }, include: { lessons: { orderBy: { sortOrder: "asc" } }, files: { where: { lessonId: null } }, chapters: { where: { lessonId: "" }, orderBy: { code: "asc" } } } }),
    prisma.product.findMany({ where: { active: true }, orderBy: { title: "asc" }, select: { slug: true, title: true }, take: 200 }).catch(() => []),
    readChapterCatalog().catch(() => [] as { code: string; title: string }[]),
  ]);
  if (!course) notFound();
  const toman = Math.round(course.priceRials / 10);
  const sale = course.salePriceRials != null ? Math.round(course.salePriceRials / 10) : "";
  return (
    <>
      <PageTitle title={course.title} action={<Link href="/admin/classes" className="text-sm font-bold text-muted">بازگشت</Link>} />
      <Flash ok={sp.ok} />
      {sp.e && <p className="mb-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-800">{sp.e === "link" ? "لینک یا شناسهٔ ویدیو شناخته نشد." : sp.e === "mobile" ? "موبایل نامعتبر است." : sp.e === "nostudent" ? "این شماره هنوز در کلاس‌ها ثبت‌نام نکرده." : sp.e}</p>}
      <Panel title="مشخصات و قیمت">
        <form action={saveCourse} className="space-y-4">
          <input type="hidden" name="id" value={course.id} />
          <Field label="عنوان" name="title" defaultValue={course.title} required />
          <Field label="نامک" name="slug" defaultValue={course.slug} dir="ltr" />
          <Field label="مدرس" name="teacher" defaultValue={course.teacher} />
          <Area label="خلاصه" name="summary" defaultValue={course.summary} />
          <Area label="معرفی" name="intro" defaultValue={course.intro} />
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="قیمت اصلی (تومان)" name="priceToman" type="number" defaultValue={toman} />
            <Field label="قیمت با تخفیف (تومان)" name="saleToman" type="number" defaultValue={sale} />
            <Field label="ترتیب" name="sortOrder" type="number" defaultValue={course.sortOrder} />
          </div>
          <label className="block text-sm font-semibold">جزوهٔ مرتبط
            <select name="bookletSlug" defaultValue={course.bookletSlug} className="input mt-1">
              <option value="">بدون جزوه</option>
              {products.map((p) => <option key={p.slug} value={p.slug}>{p.title}</option>)}
            </select>
          </label>
          <div className="flex flex-wrap gap-4 text-sm">
            {GRADES.map((g) => <label key={g.id} className="inline-flex items-center gap-1"><input type="checkbox" name="grades" value={g.id} defaultChecked={course.grades.includes(g.id)} />{g.label}</label>)}
            {FIELDS.map((f) => <label key={f.id} className="inline-flex items-center gap-1"><input type="checkbox" name="fields" value={f.id} defaultChecked={course.fields.includes(f.id)} />{f.label}</label>)}
          </div>
          <div className="flex flex-wrap gap-4">
            <Check label="رایگان" name="isFree" defaultChecked={course.isFree} />
            <Check label="پریمیوم (کل دوره)" name="isPremium" defaultChecked={course.isPremium} />
            <Check label="پیشنهاد مشاوره" name="suggestConsult" defaultChecked={course.suggestConsult} />
            <Check label="منتشر" name="published" defaultChecked={course.published} />
          </div>
          <div><span className="label">کاور</span><input type="file" name="cover" accept="image/*" /></div>
          <SubmitButton>ذخیره</SubmitButton>
        </form>
      </Panel>
      <Panel title="فصل‌های بانک سؤال" className="mt-6">
        <form action={saveChapters} className="space-y-3">
          <input type="hidden" name="courseId" value={course.id} />
          <input type="hidden" name="lessonId" value="" />
          <Area label="کد فصل‌ها" name="codes" dir="ltr" rows={6} defaultValue={course.chapters.map((c) => c.code).join("\n")} hint="هر خط یک کد، مثلاً H2-4. خالی گذاشتن و ذخیره، پیوند این دوره را برمی‌دارد." />
          <SubmitButton>ذخیرهٔ فصل‌ها</SubmitButton>
        </form>
        <ul className="mt-3 max-h-40 overflow-auto text-xs text-muted">
          {catalog.filter((c) => course.chapters.some((x) => x.code === c.code) || course.chapters.length === 0).slice(0, 40).map((c) => <li key={c.code} dir="ltr">{c.code} — {c.title}</li>)}
        </ul>
      </Panel>
      <Panel title="جلسه‌ها" className="mt-6">
        <ul className="divide-y divide-line">
          {course.lessons.map((l) => (
            <li key={l.id} className="flex flex-wrap items-center justify-between gap-3 py-2 text-sm">
              <Link href={`/admin/classes/lessons/${l.id}`} className="font-bold text-navy">{l.title}</Link>
              <form action={setLessonPremium} className="flex items-center gap-2">
                <input type="hidden" name="id" value={l.id} />
                <label className="inline-flex items-center gap-1 font-bold"><input type="checkbox" name="isPremium" defaultChecked={l.isPremium} className="accent-navy" /> پریمیوم</label>
                <button className="rounded-full bg-navy px-3 py-1 text-xs font-bold text-white">ثبت</button>
              </form>
            </li>
          ))}
        </ul>
        <form action={addLesson} className="mt-4 grid gap-3 sm:grid-cols-2">
          <input type="hidden" name="courseId" value={course.id} />
          <Field label="لینک یا شناسهٔ ویدیو" name="link" dir="ltr" required hint="همان لینک اشتراک‌گذاری. برای دانش‌آموز نمایش داده نمی‌شود." />
          <Field label="عنوان" name="title" />
          <Field label="ترتیب" name="sortOrder" type="number" defaultValue={course.lessons.length} />
          <Field label="مدت (دقیقه)" name="durationMin" type="number" />
          <Check label="پیش‌نمایش رایگان" name="freePreview" />
          <Check label="پریمیوم" name="isPremium" defaultChecked />
          <SubmitButton>افزودن جلسه</SubmitButton>
        </form>
      </Panel>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Panel title="فایل PDF">
          <ul className="mb-3 text-sm">{course.files.map((f) => <li key={f.id}>{f.title}</li>)}</ul>
          <form action={saveFile} className="space-y-3">
            <input type="hidden" name="courseId" value={course.id} />
            <Field label="عنوان" name="title" />
            <input type="file" name="file" accept="application/pdf" required />
            <SubmitButton>بارگذاری</SubmitButton>
          </form>
        </Panel>
        <Panel title="ثبت‌نام دستی">
          <form action={manualEnroll} className="space-y-3">
            <input type="hidden" name="courseId" value={course.id} />
            <Field label="موبایل دانش‌آموز" name="mobile" dir="ltr" hint="باید قبلاً یک بار وارد کلاس‌ها شده باشد." />
            <SubmitButton>ثبت‌نام</SubmitButton>
          </form>
        </Panel>
      </div>
    </>
  );
}
