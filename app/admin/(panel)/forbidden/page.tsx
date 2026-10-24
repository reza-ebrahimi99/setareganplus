import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { PERM_LABEL } from "@/lib/perms";

export const metadata = { title: "دسترسی ندارید" };

export default async function Forbidden({ searchParams }: { searchParams: Promise<{ p?: string }> }) {
  const me = await requireAdmin();
  const { p } = await searchParams;
  const label = p ? PERM_LABEL[p] : null;
  return (
    <div className="mx-auto mt-10 max-w-lg rounded-3xl border border-line bg-paper p-8 text-center shadow-sm">
      <div className="mx-auto mb-5 flex size-16 items-center justify-center rounded-2xl bg-gc-soft text-gc">
        <svg viewBox="0 0 24 24" className="size-8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 018 0v4" /></svg>
      </div>
      <h1 className="text-2xl font-extrabold text-navy">دسترسی ندارید</h1>
      <p className="mt-3 leading-8 text-muted">
        {me.name} عزیز، شما به این بخش{label ? <> («<b className="text-ink">{label}</b>»)</> : null} دسترسی ندارید.
        <br />اگر لازم است، از مدیر بخواهید این دسترسی را برایتان فعال کند.
      </p>
      <Link href="/admin" className="btn-gold mt-6 inline-flex px-6 py-2.5">بازگشت به پنل</Link>
    </div>
  );
}
