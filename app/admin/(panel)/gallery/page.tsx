/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { s } from "@/lib/admin";
import { fa, slugify } from "@/lib/format";
import { PageTitle, Panel, Field, Flash } from "@/components/admin/ui";
import { SubmitButton } from "@/components/admin/SubmitButton";

async function create(fd: FormData) {
  "use server";
  await requireAdmin();
  const title = s(fd, "title");
  if (!title) return;
  let slug = slugify(s(fd, "slug") || title);
  if (await prisma.galleryAlbum.findUnique({ where: { slug } })) slug = `${slug}-${Date.now().toString(36)}`;
  const al = await prisma.galleryAlbum.create({ data: { title, slug, sortOrder: 0 } });
  redirect(`/admin/gallery/${al.id}`);
}

export default async function GalleryAdmin({ searchParams }: { searchParams: Promise<{ ok?: string }> }) {
  const { ok } = await searchParams;
  const albums = await prisma.galleryAlbum.findMany({ orderBy: { sortOrder: "asc" }, include: { _count: { select: { photos: true } } } });
  return (
    <>
      <PageTitle title="گالری" sub="آلبوم‌ها و تصاویر" />
      <Flash ok={ok} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {albums.map((a) => (
          <Link key={a.id} href={`/admin/gallery/${a.id}`} className="overflow-hidden rounded-2xl border border-line bg-paper hover:border-navy/20">
            <div className="aspect-[16/9] bg-ivory">{a.cover && <img src={a.cover} alt="" className="size-full object-cover" />}</div>
            <div className="p-4"><p className="font-bold text-navy">{a.title}</p><p className="text-xs text-muted">{fa(a._count.photos)} تصویر {a.published ? "" : "· پنهان"}</p></div>
          </Link>
        ))}
      </div>
      <Panel title="آلبوم جدید" className="mt-6">
        <form action={create} className="grid items-end gap-4 sm:grid-cols-[1fr_1fr_auto]">
          <Field label="عنوان آلبوم" name="title" required />
          <Field label="نامک (اختیاری، لاتین)" name="slug" dir="ltr" />
          <SubmitButton>ساخت آلبوم</SubmitButton>
        </form>
      </Panel>
    </>
  );
}
