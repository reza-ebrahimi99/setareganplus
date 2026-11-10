import Link from "next/link";
import { fa } from "@/lib/format";
import { classJoinPath, formatFileSize } from "@/lib/classes/catalog";

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

export function CourseFileList({ files, slug, loggedIn, enrolled }: { files: { id: string; title: string; bytes: number }[]; slug: string; loggedIn: boolean; enrolled: boolean }) {
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
          const href = enrolled ? `/classes/files/${file.id}` : classJoinPath(slug, `/classes/files/${file.id}`);
          return (
            <li key={file.id} className="cl-file">
              <span className="grid size-16 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-[#ffc83d] to-[#e0a010] shadow-sm">
                <PdfIcon />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-base font-extrabold">{file.title}</span>
                <span className="cl-muted mt-1 block text-xs">{size ? fa(size) : "PDF"} · جزوهٔ دوره</span>
              </span>
              {enrolled ? (
                <a href={href} className="btn-gold justify-center px-4 py-2 text-sm">دانلود PDF</a>
              ) : (
                <Link href={href} className="btn-ghost justify-center px-4 py-2 text-sm">
                  <LockIcon />
                  {loggedIn ? "برای دانلود ثبت‌نام کنید" : "برای دانلود وارد شوید"}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
