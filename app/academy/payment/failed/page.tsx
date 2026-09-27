import Link from "next/link";
import { AcademyShell } from "@/components/academy/AcademyShell";

export default function AcademyPaymentFailedPage() {
  return (
    <AcademyShell>
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <div className="academy-card p-10">
          <h1 className="text-xl font-bold text-danger">پرداخت ناموفق</h1>
          <p className="mt-4 text-muted">
            پرداخت تکمیل نشد. می‌توانید دوباره تلاش کنید یا با پشتیبانی تماس بگیرید.
          </p>
          <Link href="/courses" className="academy-btn-primary mt-8 inline-flex">
            بازگشت به دوره‌ها
          </Link>
        </div>
      </div>
    </AcademyShell>
  );
}
