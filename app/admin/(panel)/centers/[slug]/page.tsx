import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePerm } from "@/lib/auth";
import { s, sn, b, rows, imageField } from "@/lib/admin";
import { PageTitle, Panel, Field, Area, Check, ImageInput, SaveBar, Flash } from "@/components/admin/ui";

export default async function CenterEdit({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ ok?: string }> }) {
  await requirePerm("content.centers");
  const { slug } = await params;
  const { ok } = await searchParams;
  const [c, forms] = await Promise.all([
    prisma.center.findUnique({ where: { slug } }),
    prisma.form.findMany({ where: { status: "PUBLISHED" }, select: { slug: true, title: true } }),
  ]);
  if (!c) notFound();
  const hl = (c.highlights as { title: string; text?: string }[]).map((h) => `${h.title} | ${h.text ?? ""}`).join("\n");
  const br = (c.branches as { name: string; address: string; mapUrl?: string }[]).map((x) => `${x.name} | ${x.address} | ${x.mapUrl ?? ""}`).join("\n");

  async function save(fd: FormData) {
    "use server";
    await requirePerm("content.centers");
    await prisma.center.update({
      where: { slug },
      data: {
        name: s(fd, "name"),
        shortName: s(fd, "shortName"),
        tagline: sn(fd, "tagline"),
        intro: sn(fd, "intro"),
        body: sn(fd, "body"),
        highlights: rows(s(fd, "highlights"), 2).map(([title, text]) => ({ title, text })),
        branches: rows(s(fd, "branches"), 3).map(([name, address, mapUrl]) => ({ name, address, mapUrl })),
        formSlug: sn(fd, "formSlug"),
        published: b(fd, "published"),
        heroImage: await imageField(fd, "heroImage", c!.heroImage, "centers"),
      },
    });
    redirect(`/admin/centers/${slug}?ok=1`);
  }
  return (
    <>
      <PageTitle title={c.name} sub={`صفحه عمومی: /${slug}`} action={<a href={`/${slug}`} target="_blank" className="btn-ghost px-4 py-2 text-sm">مشاهده صفحه ↗</a>} />
      <Flash ok={ok} />
      <form action={save} className="space-y-6">
        <Panel title="معرفی">
          <div className="grid gap-5 md:grid-cols-2">
            <Field label="نام کامل" name="name" defaultValue={c.name} required />
            <Field label="نام کوتاه" name="shortName" defaultValue={c.shortName} />
            <div className="md:col-span-2"><Field label="شعار / زیرعنوان" name="tagline" defaultValue={c.tagline} /></div>
            <div className="md:col-span-2"><Area label="معرفی کوتاه (بالای صفحه)" name="intro" defaultValue={c.intro} rows={3} /></div>
            <div className="md:col-span-2"><Area label="متن تکمیلی" name="body" defaultValue={c.body} rows={5} hint="برای پاراگراف جدید یک خط خالی بگذارید." /></div>
            <ImageInput label="تصویر اصلی" name="heroImage" current={c.heroImage} />
            <div className="space-y-3">
              <label className="block"><span className="label">فرم ثبت‌نام این صفحه</span>
                <select name="formSlug" defaultValue={c.formSlug ?? ""} className="input"><option value="">— بدون فرم —</option>{forms.map((f) => <option key={f.slug} value={f.slug}>{f.title}</option>)}</select>
              </label>
              <Check label="صفحه منتشر شود" name="published" defaultChecked={c.published} />
            </div>
          </div>
        </Panel>
        <Panel title="دوره‌ها و خدمات">
          <Area label="هر خط یک مورد: عنوان | توضیح" name="highlights" defaultValue={hl} rows={8} />
        </Panel>
        <Panel title="شعبه‌ها">
          <Area label="هر خط یک شعبه: نام | نشانی | لینک نقشه" name="branches" defaultValue={br} rows={3} hint="اگر خالی باشد، بخش شعبه‌ها در این صفحه نمایش داده نمی‌شود." />
        </Panel>
        <SaveBar back="/admin/centers" />
      </form>
    </>
  );
}
