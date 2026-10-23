/* eslint-disable @next/next/no-img-element */
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { s, sn, b, n } from "@/lib/admin";
import { saveImage } from "@/lib/uploads";
import { fa } from "@/lib/format";
import { PageTitle, Panel, Field, Area, Check, Flash } from "@/components/admin/ui";
import { SubmitButton } from "@/components/admin/SubmitButton";

export default async function AlbumAdmin({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; e?: string }> }) {
  const { id } = await params;
  const { ok, e } = await searchParams;
  const al = await prisma.galleryAlbum.findUnique({ where: { id }, include: { photos: { orderBy: { sortOrder: "asc" } } } });
  if (!al) notFound();
  const back = `/admin/gallery/${id}`;

  async function saveAlbum(fd: FormData) {
    "use server";
    await requireAdmin();
    await prisma.galleryAlbum.update({
      where: { id },
      data: { title: s(fd, "title"), description: sn(fd, "description"), center: sn(fd, "center"), published: b(fd, "published"), sortOrder: n(fd, "sortOrder") },
    });
    redirect(`${back}?ok=1`);
  }
  async function upload(fd: FormData) {
    "use server";
    await requireAdmin();
    const files = fd.getAll("photos").filter((f): f is File => f instanceof File && f.size > 0);
    const max = (await prisma.galleryPhoto.aggregate({ where: { albumId: id }, _max: { sortOrder: true } }))._max.sortOrder ?? -1;
    let i = max + 1;
    let first: string | null = null;
    try {
      for (const f of files) {
        const path = await saveImage(f, "gallery");
        first ??= path;
        await prisma.galleryPhoto.create({ data: { albumId: id, path, sortOrder: i++ } });
      }
    } catch {
      redirect(`${back}?e=upload`);
    }
    if (first && !al!.cover) await prisma.galleryAlbum.update({ where: { id }, data: { cover: first } });
    redirect(`${back}?ok=1`);
  }
  async function photoAction(fd: FormData) {
    "use server";
    await requireAdmin();
    const pid = s(fd, "pid");
    const op = s(fd, "op");
    const photos = await prisma.galleryPhoto.findMany({ where: { albumId: id }, orderBy: { sortOrder: "asc" } });
    const idx = photos.findIndex((p) => p.id === pid);
    if (idx < 0) return;
    if (op === "delete") {
      await prisma.galleryPhoto.delete({ where: { id: pid } });
      if (al!.cover === photos[idx].path) await prisma.galleryAlbum.update({ where: { id }, data: { cover: photos.find((p) => p.id !== pid)?.path ?? null } });
    } else if (op === "cover") {
      await prisma.galleryAlbum.update({ where: { id }, data: { cover: photos[idx].path } });
    } else if (op === "up" || op === "down") {
      const j = op === "up" ? idx - 1 : idx + 1;
      if (j >= 0 && j < photos.length) {
        const [x, y] = [photos[idx], photos[j]];
        await prisma.$transaction([
          prisma.galleryPhoto.update({ where: { id: x.id }, data: { sortOrder: j } }),
          prisma.galleryPhoto.update({ where: { id: y.id }, data: { sortOrder: idx } }),
        ]);
      }
    }
    revalidatePath(back);
  }
  async function removeAlbum() {
    "use server";
    await requireAdmin();
    await prisma.galleryAlbum.delete({ where: { id } });
    redirect("/admin/gallery?ok=1");
  }

  return (
    <>
      <PageTitle title={al.title} sub={`${fa(al.photos.length)} تصویر · /gallery/${al.slug}`} />
      <Flash ok={ok} />
      {e && <p className="mb-4 rounded-xl bg-gc-soft px-4 py-3 text-sm text-gc">بارگذاری برخی تصاویر انجام نشد (فرمت یا حجم نامعتبر).</p>}
      <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        <Panel title="مشخصات آلبوم">
          <form action={saveAlbum} className="space-y-4">
            <Field label="عنوان" name="title" defaultValue={al.title} required />
            <Area label="توضیح" name="description" defaultValue={al.description} rows={3} />
            <label className="block"><span className="label">مرکز</span>
              <select name="center" defaultValue={al.center ?? ""} className="input"><option value="">عمومی</option><option value="education">آموزشگاه ستارگان</option><option value="ghalamchi">قلم‌چی نسیم‌شهر</option></select>
            </label>
            <div className="flex items-end gap-5"><div className="w-28"><Field label="ترتیب" name="sortOrder" type="number" defaultValue={al.sortOrder} /></div><Check label="منتشر شود" name="published" defaultChecked={al.published} /></div>
            <SubmitButton>ذخیره</SubmitButton>
          </form>
        </Panel>
        <Panel title="افزودن تصاویر">
          <form action={upload} className="space-y-4">
            <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-line bg-ivory px-6 py-10 text-center hover:border-edu/40">
              <span className="font-bold text-navy">انتخاب چند تصویر</span>
              <span className="text-xs text-muted">JPG / PNG / WEBP — به‌صورت خودکار فشرده و بهینه می‌شوند</span>
              <input type="file" name="photos" multiple accept="image/*" className="text-sm" />
            </label>
            <SubmitButton>بارگذاری</SubmitButton>
          </form>
        </Panel>
      </div>
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {al.photos.map((p, i) => (
          <div key={p.id} className={`overflow-hidden rounded-xl border bg-paper ${al.cover === p.path ? "border-gold" : "border-line"}`}>
            <img src={p.path} alt="" loading="lazy" className="aspect-square w-full object-cover" />
            <form action={photoAction} className="flex items-center justify-between gap-1 p-1.5 text-xs">
              <input type="hidden" name="pid" value={p.id} />
              <span className="flex gap-1">
                <button name="op" value="up" disabled={i === 0} className="rounded-lg px-2 py-1 hover:bg-ivory disabled:opacity-30" title="قبلی">→</button>
                <button name="op" value="down" disabled={i === al.photos.length - 1} className="rounded-lg px-2 py-1 hover:bg-ivory disabled:opacity-30" title="بعدی">←</button>
              </span>
              <span className="flex gap-1">
                {al.cover === p.path ? <span className="px-1 text-gold-ink">کاور</span> : <button name="op" value="cover" className="rounded-lg px-2 py-1 hover:bg-ivory">کاور</button>}
                <button name="op" value="delete" className="rounded-lg px-2 py-1 text-gc hover:bg-gc-soft">حذف</button>
              </span>
            </form>
          </div>
        ))}
      </div>
      <form action={removeAlbum} className="mt-8"><SubmitButton className="text-sm font-semibold text-gc hover:underline" confirm="کل آلبوم و تصاویرش حذف شود؟">حذف آلبوم</SubmitButton></form>
    </>
  );
}
