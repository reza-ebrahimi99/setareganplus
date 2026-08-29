import { Timeline } from "@/components/admin/Timeline";
import { CommerceQrImg } from "@/components/commerce/CommerceQrImg";
import { BookletReceiptActions } from "@/components/commerce/BookletReceiptActions";
import { buildOpsTimelineNodes } from "@/lib/commerce/orders/timeline-view";
import {
  commerceOrderPublicQrImagePath,
  commerceOrderQrPath,
} from "@/lib/commerce/orders/qr";
import type { PublicBookletTicket } from "@/lib/commerce/orders/public-ticket";
import { toPersianDigits } from "@/lib/persian";

function Row({ label, value }: { label: string; value: string }) {
  return (
    <p>
      <span className="text-muted">{label}:</span> {value}
    </p>
  );
}

export function BookletPublicTicket({ ticket }: { ticket: PublicBookletTicket }) {
  const timeline = buildOpsTimelineNodes({
    current: ticket.opsStage,
    events: ticket.events,
  });
  const waiting = !ticket.delivered && ticket.opsStage !== "READY_FOR_PICKUP";

  return (
    <article className="booklet-receipt mx-auto max-w-2xl overflow-hidden rounded-[1.75rem] border border-white/80 bg-white/80 shadow-[0_20px_60px_rgb(15_23_42_/_0.1)]">
      <header
        className={`px-6 py-8 text-center text-white sm:px-8 ${
          ticket.delivered
            ? "bg-emerald-700"
            : waiting
              ? "bg-amber-600"
              : "bg-primary"
        }`}
      >
        <h1 className="text-2xl font-bold">
          {ticket.delivered
            ? "جزوه تحویل شد"
            : waiting
              ? "جزوه در حال آماده‌سازی است"
              : "جزوه آماده تحویل است"}
        </h1>
        <p className="mt-2 text-sm text-white/90">{ticket.statusLabel}</p>
        <p className="mt-2 font-mono text-lg font-bold" dir="ltr">
          {toPersianDigits(ticket.orderNumber)}
        </p>
      </header>

      <div className="space-y-4 px-4 py-5 sm:px-6">
        <section className="rounded-2xl border border-border bg-white p-4 text-sm leading-7">
          <Row label="دانش‌آموز" value={ticket.studentName} />
          <Row label="جزوه" value={ticket.booklet} />
          <Row label="مبلغ" value={ticket.amountLabel} />
          <Row label="محل دریافت" value={ticket.pickupBranch?.name ?? "—"} />
          {ticket.pickupBranch?.address ? (
            <Row label="آدرس" value={ticket.pickupBranch.address} />
          ) : null}
          <Row label="شماره سفارش" value={toPersianDigits(ticket.orderNumber)} />
          <Row label="تاریخ پرداخت" value={ticket.paidAtLabel ?? "—"} />
          <Row label="وضعیت" value={ticket.statusLabel} />
        </section>

        {waiting ? (
          <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-7 text-amber-950">
            <p>{ticket.eta.text}</p>
          </section>
        ) : null}

        <section className="booklet-receipt-qr rounded-2xl border border-primary/15 bg-white px-4 py-6 text-center">
          <CommerceQrImg src={ticket.qrDataUrl} alt="QR دریافت جزوه" size={280} className="mx-auto" />
          <p className="mx-auto mt-4 max-w-sm text-sm leading-7 text-muted">{ticket.instructions}</p>
        </section>

        <section id="pipeline" className="rounded-2xl border border-border bg-white p-4">
          <h2 className="text-sm font-semibold text-primary">مسیر سفارش</h2>
          <div className="mt-3">
            <Timeline nodes={timeline} />
          </div>
        </section>

        {ticket.delivered ? (
          <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950">
            <p className="font-bold">تحویل ثبت شد</p>
            {ticket.deliveredAtLabel ? <p className="mt-1">{ticket.deliveredAtLabel}</p> : null}
            <p className="mt-1">تحویل‌دهنده: {ticket.deliveredByName ?? "—"}</p>
          </section>
        ) : null}

        <BookletReceiptActions
          orderNumber={ticket.orderNumber}
          statusHref={`${commerceOrderQrPath(ticket.qrToken)}#pipeline`}
          qrHref={commerceOrderPublicQrImagePath(ticket.qrToken)}
        />
      </div>
    </article>
  );
}
