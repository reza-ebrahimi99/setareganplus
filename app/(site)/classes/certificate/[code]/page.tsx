import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { jalaliDateTime } from "@/lib/format";
import { buildMeta } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ code: string }> }): Promise<Metadata> {
  const { code } = await params;
  return buildMeta({ title: "گواهی دوره", description: "اعتبارسنجی گواهی پایان دورهٔ ستارگان پلاس.", path: `/classes/certificate/${code}`, noindex: true });
}

export default async function CertificatePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const row = await prisma.classCertificate.findUnique({ where: { code }, include: { student: true, course: true } });
  if (!row) notFound();
  return (
    <div className="container-x pb-16">
      <article className="cl-paper mx-auto max-w-3xl border-[6px] border-[#f4b21b] p-8 sm:p-12">
        <div className="mx-auto mb-4 size-16 overflow-hidden rounded-2xl bg-white"><img src="/brand/logo.png" alt="ستارگان پلاس" className="size-full object-contain" /></div>
        <p className="text-center text-sm font-bold text-[#7a5600]">ستارگان پلاس · نسیم‌شهر</p>
        <h1 className="cl-display mt-3 text-center text-4xl">گواهی پایان دوره</h1>
        <p className="mt-8 text-center text-lg">این گواهی تأیید می‌کند</p>
        <p className="cl-display mt-2 text-center text-3xl">{row.student.firstName} {row.student.lastName}</p>
        <p className="mt-4 text-center text-lg">دورهٔ <b>{row.course.title}</b> را با تدریس {row.course.teacher} به پایان رسانده است.</p>
        <p className="mt-6 text-center text-sm text-[#5c677c]">{jalaliDateTime(row.issuedAt)}</p>
        <p className="mt-6 text-center font-extrabold tracking-widest" dir="ltr">{row.code}</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3 print:hidden">
          <a href={`/classes/certificate/${row.code}/pdf`} className="btn-navy px-5 py-2 text-sm">دانلود PDF</a>
          <Link href="/classes" className="btn-ghost px-5 py-2 text-sm">دوره‌ها</Link>
        </div>
      </article>
    </div>
  );
}
