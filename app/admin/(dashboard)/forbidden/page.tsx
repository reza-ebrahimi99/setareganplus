import Link from "next/link";

export default function ForbiddenPage() {
  return (
    <div className="admin-card mx-auto max-w-xl p-8 text-center">
      <h1 className="text-xl font-bold text-primary">دسترسی مجاز نیست</h1>
      <p className="mt-3 text-sm leading-7 text-muted">نقش شما اجازه مشاهده یا تغییر این بخش را ندارد.</p>
      <Link href="/admin/workspace" className="mt-5 inline-block rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white">بازگشت به میز کار</Link>
    </div>
  );
}
