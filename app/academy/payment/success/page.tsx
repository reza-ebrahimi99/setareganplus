import Link from "next/link";
import { AcademyShell } from "@/components/academy/AcademyShell";

type Props = { searchParams?: Promise<{ order?: string }> };

export default async function AcademyPaymentSuccessPage({ searchParams }: Props) {
  const params = searchParams ? await searchParams : {};
  return (
    <AcademyShell>
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <div className="academy-card p-10">
          <h1 className="text-xl font-bold text-success">پرداخت موفق</h1>
          {params.order ? (
            <p className="mt-3 text-sm text-muted">
              شماره سفارش:{" "}
              <span dir="ltr" className="font-mono">
                {params.order}
              </span>
            </p>
          ) : null}
          <p className="mt-4 text-muted">دسترسی شما فعال شد.</p>
          <Link href="/account/library" className="academy-btn-primary mt-8 inline-flex">
            شروع یادگیری
          </Link>
        </div>
      </div>
    </AcademyShell>
  );
}
