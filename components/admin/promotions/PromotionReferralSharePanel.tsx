"use client";

import { useState, useTransition } from "react";

type Props = {
  promotionId: string;
  code: string;
  flowSlug: string;
  referralUrl: string;
  qrDataUrl: string | null;
};

export function PromotionReferralSharePanel({
  promotionId,
  code,
  flowSlug,
  referralUrl,
  qrDataUrl,
}: Props) {
  const [copied, setCopied] = useState<"code" | "link" | null>(null);
  const [pending, startTransition] = useTransition();

  function copy(text: string, kind: "code" | "link") {
    startTransition(async () => {
      try {
        await navigator.clipboard.writeText(text);
        setCopied(kind);
        setTimeout(() => setCopied(null), 2000);
      } catch {
        /* ignore */
      }
    });
  }

  return (
    <section className="space-y-3 rounded-2xl border border-border bg-white p-4 sm:p-5">
      <h2 className="text-sm font-bold text-primary">لینک معرف و QR</h2>
      <p className="text-xs text-muted">
        لینک عمومی با کد <span dir="ltr">{code}</span> برای جریان{" "}
        <span dir="ltr">{flowSlug}</span>
      </p>
      <div className="rounded-xl border border-border bg-slate-50 px-3 py-2 font-mono text-xs break-all" dir="ltr">
        {referralUrl}
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={() => copy(code, "code")}
          className="min-h-10 rounded-xl border border-border px-3 py-2 text-xs font-medium"
        >
          {copied === "code" ? "کپی شد" : "کپی کد"}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => copy(referralUrl, "link")}
          className="min-h-10 rounded-xl border border-border px-3 py-2 text-xs font-medium"
        >
          {copied === "link" ? "کپی شد" : "کپی لینک"}
        </button>
        <a
          href={`/admin/promotions/${promotionId}/qr.png?flow=${encodeURIComponent(flowSlug)}`}
          className="inline-flex min-h-10 items-center rounded-xl bg-primary px-3 py-2 text-xs font-medium text-white"
        >
          دانلود QR PNG
        </a>
      </div>
      {qrDataUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={qrDataUrl}
          alt={`QR referral ${code}`}
          className="mx-auto size-48 rounded-xl border border-border bg-white p-2"
        />
      ) : (
        <p className="text-sm text-muted">پیش‌نمایش QR در دسترس نیست.</p>
      )}
    </section>
  );
}
