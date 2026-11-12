import Link from "next/link";
import { fa } from "@/lib/format";
import { classJoinPath, formatFileSize, isMultivitaminTitle } from "@/lib/classes/catalog";

export type ClassPdf = { id: string; title: string; bytes: number };

export function splitCourseFiles<T extends { title: string }>(files: T[]) {
  const vitamin: T[] = [];
  const booklets: T[] = [];
  for (const file of files) (isMultivitaminTitle(file.title) ? vitamin : booklets).push(file);
  return { vitamin, booklets };
}

export function PdfIcon() {
  return (
    <svg viewBox="0 0 48 48" className="size-9" aria-hidden="true">
      <path d="M8 8.5A4.5 4.5 0 0 1 12.5 4H28l12 12v23.5A4.5 4.5 0 0 1 35.5 44h-23A4.5 4.5 0 0 1 8 39.5v-31z" fill="#0a1a3f" />
      <path d="M28 4v9.5A2.5 2.5 0 0 0 30.5 16H40L28 4z" fill="#f4b21b" />
      <path d="M14 28.5h20M14 33.5h14" stroke="#f4b21b" strokeWidth="1.8" strokeLinecap="round" />
      <text x="24" y="24" textAnchor="middle" fill="#f4b21b" fontSize="9" fontWeight="800" fontFamily="ui-sans-serif, sans-serif">PDF</text>
    </svg>
  );
}

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" strokeLinecap="round" />
    </svg>
  );
}

export function CapsuleIcon({ className = "size-14" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <circle cx="8" cy="16" r="3.2" fill="#ff7a45" />
      <circle cx="54" cy="10" r="2.2" fill="#ffc2a8" />
      <circle cx="58" cy="30" r="1.7" fill="#ff8f6b" />
      <circle cx="12" cy="50" r="1.8" fill="#ffd7b0" />
      <g transform="rotate(-42 32 34)">
        <rect x="8" y="24" width="48" height="20" rx="10" fill="#fff8f1" />
        <path d="M32 24h14a10 10 0 0 1 0 20H32z" fill="#ff7a45" />
        <path d="M18 29.5c4-3 8-3.2 12-1" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" opacity="0.85" />
        <ellipse cx="42" cy="30" rx="5" ry="2.2" fill="#fff" opacity="0.55" />
      </g>
    </svg>
  );
}

function FileDownload({ file, slug, loggedIn, enrolled }: { file: ClassPdf; slug: string; loggedIn: boolean; enrolled: boolean }) {
  const href = enrolled ? `/classes/files/${file.id}` : classJoinPath(slug, `/classes/files/${file.id}`);
  if (enrolled) return <a href={href} className="btn-gold justify-center px-4 py-2 text-sm">دانلود PDF</a>;
  return (
    <Link href={href} className="btn-ghost justify-center px-4 py-2 text-sm">
      <LockIcon />
      {loggedIn ? "برای دانلود ثبت‌نام کنید" : "برای دانلود وارد شوید"}
    </Link>
  );
}

export function MultivitaminFiles({ files, slug, loggedIn, enrolled }: { files: ClassPdf[]; slug: string; loggedIn: boolean; enrolled: boolean }) {
  if (files.length === 0) return null;
  return (
    <section id="multivitamin" className="cl-vitamin mt-6">
      <div className="flex items-start gap-3">
        <CapsuleIcon />
        <div>
          <h2 className="cl-display text-2xl text-[#3a2014]">مولتی‌ویتامین ریاضی</h2>
          <p className="mt-1 text-sm leading-7 text-[#7a4632]">خلاصهٔ کامل و نکته‌های تستی این مبحث، بعد از دیدن فیلم بخون</p>
        </div>
      </div>
      <ul className="mt-4 space-y-3">
        {files.map((file) => {
          const size = formatFileSize(file.bytes);
          return (
            <li key={file.id} className="cl-vitamin-card cl-lift">
              <CapsuleIcon className="size-12 shrink-0" />
              <span className="min-w-0 flex-1">
                <span className="inline-flex rounded-full bg-[#ff7a45] px-2 py-0.5 text-[0.7rem] font-extrabold text-white">خلاصه درس</span>
                <span className="mt-1 block text-base font-extrabold text-[#3a2014]">{file.title}</span>
                <span className="mt-1 block text-xs text-[#8a5340]">{size ? fa(size) : "PDF"}</span>
              </span>
              <FileDownload file={file} slug={slug} loggedIn={loggedIn} enrolled={enrolled} />
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function MultivitaminHint({ slug, show }: { slug: string; show: boolean }) {
  if (!show) return null;
  return (
    <Link href={`/classes/${slug}#multivitamin`} className="cl-vitamin cl-lift flex items-center gap-3 px-4 py-3">
      <CapsuleIcon className="size-10 shrink-0" />
      <span className="font-extrabold text-[#3a2014]">مولتی‌ویتامین این مبحث را بگیر</span>
    </Link>
  );
}

export function CourseFileList({ files, slug, loggedIn, enrolled }: { files: ClassPdf[]; slug: string; loggedIn: boolean; enrolled: boolean }) {
  if (files.length === 0) return null;
  return (
    <section className="cl-card mt-6 p-5 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h2 className="cl-display text-2xl">جزوه‌ها و فایل‌های دوره</h2>
        <p className="cl-muted text-sm">{fa(files.length)} فایل PDF</p>
      </div>
      <ul className="mt-4 space-y-3">
        {files.map((file) => {
          const size = formatFileSize(file.bytes);
          return (
            <li key={file.id} className="cl-file">
              <span className="grid size-16 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-[#ffc83d] to-[#e0a010] shadow-sm">
                <PdfIcon />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-base font-extrabold">{file.title}</span>
                <span className="cl-muted mt-1 block text-xs">{size ? fa(size) : "PDF"} · جزوهٔ دوره</span>
              </span>
              <FileDownload file={file} slug={slug} loggedIn={loggedIn} enrolled={enrolled} />
            </li>
          );
        })}
      </ul>
    </section>
  );
}
