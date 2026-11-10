import type { Metadata } from "next";
import Link from "next/link";
import { buildMeta } from "@/lib/seo";

export const metadata: Metadata = buildMeta({ title: "نتیجهٔ پرداخت", description: "نتیجهٔ پرداخت دوره.", path: "/classes/pay/result", noindex: true });

export default async function PayResult({ searchParams }: { searchParams: Promise<{ status?: string; course?: string; m?: string }> }) {
  const sp = await searchParams;
  const ok = sp.status === "paid";
  return (
    <div className="container-x pb-16">
      <div className="cl-card mx-auto max-w-lg p-8 text-center">
        <h1 className="cl-display text-3xl">{ok ? "پرداخت انجام شد" : sp.status === "pending" ? "پرداخت در حال بررسی است" : "پرداخت انجام نشد"}</h1>
        {sp.m && <p className="cl-muted mt-3 leading-7">{sp.m}</p>}
        <div className="mt-6 flex justify-center gap-3">
          {sp.course && <Link href={`/classes/${sp.course}`} className="btn-gold">بازگشت به دوره</Link>}
          <Link href="/classes" className="btn-ghost">همهٔ دوره‌ها</Link>
        </div>
      </div>
    </div>
  );
}
