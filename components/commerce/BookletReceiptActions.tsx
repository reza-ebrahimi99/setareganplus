"use client";

import Link from "next/link";

type Props = {
  orderNumber: string;
  statusHref?: string;
  qrHref?: string;
};

export function BookletReceiptActions({ orderNumber, statusHref, qrHref }: Props) {
  function printReceipt() {
    const previous = document.title;
    document.title = `رسید-جزوه-${orderNumber}`;
    window.print();
    document.title = previous;
  }

  return (
    <div className="booklet-receipt-actions grid gap-2 print:hidden sm:grid-cols-2">
      <button
        type="button"
        onClick={printReceipt}
        className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-primary px-5 text-sm font-semibold text-white hover:bg-primary/92"
      >
        دانلود رسید PDF
      </button>
      <button
        type="button"
        onClick={printReceipt}
        className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-border bg-background px-5 text-sm font-semibold text-primary"
      >
        چاپ رسید
      </button>
      {qrHref ? (
        <a
          href={qrHref}
          download={`qr-${orderNumber}.png`}
          className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-border bg-background px-5 text-sm font-semibold text-primary"
        >
          ذخیره QR
        </a>
      ) : null}
      {statusHref ? (
        <a
          href={statusHref}
          className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-border bg-background px-5 text-sm font-semibold text-primary"
        >
          مشاهده وضعیت سفارش
        </a>
      ) : null}
      <Link
        href="/"
        className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-border bg-background px-5 text-sm font-medium text-muted sm:col-span-2"
      >
        بازگشت به صفحه اصلی
      </Link>
    </div>
  );
}
