"use client";

import { useRouter } from "next/navigation";
import { PickupQrScanner } from "@/components/admin/commerce/PickupQrScanner";

export function PickupDeskSearch({
  initialQuery = "",
}: {
  initialQuery?: string;
  autoScan?: boolean;
}) {
  const router = useRouter();

  return (
    <section className="space-y-4 rounded-3xl border border-border bg-surface p-4 sm:p-5">
      <h2 className="text-sm font-semibold text-primary">جستجو و اسکن</h2>
      <PickupQrScanner
        autoStart
        onToken={(token) => router.push(`/admin/commerce/pickup/${encodeURIComponent(token)}`)}
      />
      <form action="/admin/commerce/pickup" className="space-y-2">
        <label className="block text-sm">
          <span className="mb-1.5 block text-muted">
            QR، شماره سفارش، نام، موبایل، کد ملی یا نام پدر
          </span>
          <input
            name="q"
            defaultValue={initialQuery}
            dir="auto"
            placeholder="جستجو…"
            className="min-h-12 w-full rounded-2xl border border-border bg-background px-4"
          />
        </label>
        <button
          type="submit"
          className="min-h-12 w-full rounded-2xl border border-border px-4 text-sm font-semibold sm:w-auto"
        >
          جستجو
        </button>
      </form>
    </section>
  );
}
