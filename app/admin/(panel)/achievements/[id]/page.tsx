import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { s, sn, b, n, imageField } from "@/lib/admin";
import { PageTitle, Panel, Field, Check, ImageInput, SaveBar } from "@/components/admin/ui";
import { SubmitButton } from "@/components/admin/SubmitButton";

export default async function AchEdit({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const isNew = id === "new";
  const a = isNew ? null : await prisma.achievement.findUnique({ where: { id } });
  if (!isNew && !a) notFound();
  async function save(fd: FormData) {
    "use server";
    await requireAdmin();
    const cat = s(fd, "category");
    const data = {
      name: s(fd, "name"),
      category: (cat === "KONKUR" ? "KONKUR" : cat === "OTHER" ? "OTHER" : "GIFTED") as "KONKUR" | "GIFTED" | "OTHER",
      grade: sn(fd, "grade"),
      detail: sn(fd, "detail"),
      year: sn(fd, "year"),
      featured: b(fd, "featured"),
      published: b(fd, "published"),
      sortOrder: n(fd, "sortOrder"),
      photo: await imageField(fd, "photo", a?.photo ?? null, "achievements", 720),
    };
    if (isNew) await prisma.achievement.create({ data });
    else await prisma.achievement.update({ where: { id }, data });
    redirect("/admin/achievements?ok=1");
  }
  async function remove() {
    "use server";
    await requireAdmin();
    await prisma.achievement.delete({ where: { id } });
    redirect("/admin/achievements?ok=1");
  }
  return (
    <>
      <PageTitle title={isNew ? "افتخار جدید" : a!.name} />
      <form action={save}>
        <Panel>
          <div className="grid gap-5 md:grid-cols-2">
            <Field label="نام دانش‌آموز" name="name" defaultValue={a?.name} required />
            <label className="block"><span className="label">دسته</span>
              <select name="category" defaultValue={a?.category ?? "GIFTED"} className="input"><option value="GIFTED">تیزهوشان و نمونه دولتی</option><option value="KONKUR">کنکور</option><option value="OTHER">سایر</option></select>
            </label>
            <Field label="پایه" name="grade" defaultValue={a?.grade} placeholder="مثلاً نهم" />
            <Field label="سال تحصیلی" name="year" defaultValue={a?.year} placeholder="۱۴۰۵-۱۴۰۶" />
            <div className="md:col-span-2"><Field label="مدرسه / رشته / رتبه" name="detail" defaultValue={a?.detail} /></div>
            <ImageInput label="تصویر" name="photo" current={a?.photo} />
            <div className="space-y-3">
              <Field label="ترتیب" name="sortOrder" type="number" defaultValue={a?.sortOrder ?? 0} />
              <div className="flex gap-5"><Check label="منتشر شود" name="published" defaultChecked={a?.published ?? true} /><Check label="برجسته (صفحه اصلی)" name="featured" defaultChecked={a?.featured} /></div>
            </div>
          </div>
        </Panel>
        <SaveBar back="/admin/achievements" />
      </form>
      {!isNew && <form action={remove}><SubmitButton className="text-sm font-semibold text-gc hover:underline" confirm="حذف شود؟">حذف</SubmitButton></form>}
    </>
  );
}
