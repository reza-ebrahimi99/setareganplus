import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePerm } from "@/lib/auth";
import { s, sn, b, n, imageField } from "@/lib/admin";
import { PageTitle, Panel, Field, Area, Check, ImageInput, SaveBar } from "@/components/admin/ui";
import { SubmitButton } from "@/components/admin/SubmitButton";

export default async function TeamEdit({ params }: { params: Promise<{ id: string }> }) {
  await requirePerm("content.team");
  const { id } = await params;
  const isNew = id === "new";
  const m = isNew ? null : await prisma.teamMember.findUnique({ where: { id } });
  if (!isNew && !m) notFound();

  async function save(fd: FormData) {
    "use server";
    await requirePerm("content.team");
    const data = {
      name: s(fd, "name"),
      role: s(fd, "role"),
      education: sn(fd, "education"),
      department: sn(fd, "department"),
      bio: sn(fd, "bio"),
      featured: b(fd, "featured"),
      published: b(fd, "published"),
      sortOrder: n(fd, "sortOrder"),
      photo: await imageField(fd, "photo", m?.photo ?? null, "team", 720),
    };
    if (!data.name) redirect(`/admin/team/${id}?e=1`);
    if (isNew) await prisma.teamMember.create({ data });
    else await prisma.teamMember.update({ where: { id }, data });
    redirect("/admin/team?ok=1");
  }
  async function remove() {
    "use server";
    await requirePerm("content.team");
    await prisma.teamMember.delete({ where: { id } });
    redirect("/admin/team?ok=1");
  }
  return (
    <>
      <PageTitle title={isNew ? "عضو جدید" : m!.name} sub="اطلاعات عضو تیم" />
      <form action={save} className="space-y-6">
        <Panel>
          <div className="grid gap-5 md:grid-cols-2">
            <Field label="نام و نام خانوادگی" name="name" defaultValue={m?.name} required />
            <Field label="سمت / نقش" name="role" defaultValue={m?.role} hint="چند نقش را با « · » جدا کنید." />
            <Field label="تحصیلات" name="education" defaultValue={m?.education} />
            <Field label="بخش" name="department" defaultValue={m?.department} hint="مثلاً: مدیران واحدها، مشاوران، مدرسان و همکاران آموزشی" />
            <div className="md:col-span-2"><Area label="سوابق (هر مورد در یک خط)" name="bio" defaultValue={m?.bio} rows={5} /></div>
            <ImageInput label="عکس" name="photo" current={m?.photo} />
            <div className="space-y-3">
              <Field label="ترتیب نمایش" name="sortOrder" type="number" defaultValue={m?.sortOrder ?? 99} />
              <div className="flex gap-5"><Check label="منتشر شود" name="published" defaultChecked={m?.published ?? true} /><Check label="نمایش در صفحه اصلی" name="featured" defaultChecked={m?.featured} /></div>
            </div>
          </div>
        </Panel>
        <SaveBar back="/admin/team" />
      </form>
      {!isNew && (
        <form action={remove} className="mt-2">
          <SubmitButton className="text-sm font-semibold text-gc hover:underline" confirm="این عضو حذف شود؟">حذف این عضو</SubmitButton>
        </form>
      )}
    </>
  );
}
