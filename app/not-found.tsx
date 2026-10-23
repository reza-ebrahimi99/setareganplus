import Link from "next/link";
import { Star } from "@/components/site/Star";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
      <Star className="size-14 text-gold" />
      <h1 className="text-2xl font-extrabold text-navy">صفحه موردنظر پیدا نشد</h1>
      <p className="text-muted">ممکن است نشانی تغییر کرده باشد.</p>
      <Link href="/" className="btn-gold">بازگشت به صفحه اصلی</Link>
    </div>
  );
}
