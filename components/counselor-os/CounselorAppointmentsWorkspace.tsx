"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState, useTransition } from "react";
import {
  confirmCounselorAppointmentAction,
  rejectCounselorAppointmentAction,
} from "@/app/admin/counselor/appointment-actions";
import { OpenSessionButton } from "@/components/counselor-os/OpenSessionButton";
import type { CounselorTimelineBlock } from "@/lib/counselor-os/appointment-timeline";
import type { CounselorAppointmentView } from "@/lib/counselor-os/appointments";
import { toPersianDigits } from "@/lib/persian";

type Props = {
  pending: CounselorAppointmentView[];
  today: CounselorAppointmentView[];
  upcoming: CounselorAppointmentView[];
  timelineBlocks: CounselorTimelineBlock[];
  timelineDateLabel: string;
  timelineWeekday: string;
  canViewMobile: boolean;
};

function Toast({ message, tone }: { message: string; tone: "success" | "error" }) {
  return (
    <p
      role={tone === "error" ? "alert" : "status"}
      className={tone === "error" ? "cos-banner cos-banner--error" : "cos-banner cos-banner--ok"}
      style={{ marginBottom: "1rem" }}
    >
      {message}
    </p>
  );
}

function PendingCard({
  item,
  canViewMobile,
  onDone,
}: {
  item: CounselorAppointmentView;
  canViewMobile: boolean;
  onDone: (msg: string, err?: boolean) => void;
}) {
  const [pending, start] = useTransition();
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const confirm = () => {
    start(async () => {
      const res = await confirmCounselorAppointmentAction(item.id);
      if (res.error) onDone(res.error, true);
      else onDone(res.success ?? "جلسه تأیید شد.");
    });
  };

  const reject = () => {
    start(async () => {
      const res = await rejectCounselorAppointmentAction(item.id, rejectReason);
      if (res.error) onDone(res.error, true);
      else {
        setRejectOpen(false);
        onDone(res.success ?? "درخواست رد شد.");
      }
    });
  };

  return (
    <li className="cos-pending-card">
      <div className="cos-pending-card__main">
        <Link href={`/admin/counselor/students/${item.studentId}`}>
          <strong>{item.studentName}</strong>
        </Link>
        <span>
          {item.gradeLevel ? `${item.gradeLevel} · ` : ""}
          {item.examGroup ?? "—"}
        </span>
        {canViewMobile && item.studentMobile ? (
          <a href={`tel:${item.studentMobile}`}>{item.studentMobile}</a>
        ) : null}
        <em>
          {item.purposeLabel} · {item.weekdayLabel} · {item.whenLabel} · {item.timeRangeLabel}
        </em>
        <em>
          مشاور: {item.counselorName} · ثبت: {item.requestedAtLabel}
        </em>
        {item.reservationNotes ? <p className="cos-muted">یادداشت: {item.reservationNotes}</p> : null}
      </div>
      <div className="cos-pending-card__actions">
        <button type="button" className="cos-btn cos-btn--primary" disabled={pending} onClick={confirm}>
          تأیید
        </button>
        <button type="button" className="cos-btn cos-btn--ghost" disabled={pending} onClick={() => setRejectOpen(true)}>
          رد
        </button>
        <Link href={`/admin/counselor/appointments/${item.id}`} className="cos-link">
          جزئیات
        </Link>
        <Link href={`/admin/counselor/students/${item.studentId}`} className="cos-link">
          پرونده
        </Link>
      </div>
      {rejectOpen ? (
        <div className="cos-modal-inline">
          <label>
            علت رد (اختیاری)
            <textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} rows={2} />
          </label>
          <div>
            <button type="button" className="cos-btn" disabled={pending} onClick={reject}>
              ثبت رد
            </button>
            <button type="button" className="cos-btn cos-btn--ghost" onClick={() => setRejectOpen(false)}>
              انصراف
            </button>
          </div>
        </div>
      ) : null}
    </li>
  );
}

const KIND_CLASS: Record<CounselorTimelineBlock["kind"], string> = {
  pending: "cos-timeline__block--pending",
  confirmed: "cos-timeline__block--confirmed",
  completed: "cos-timeline__block--completed",
  no_show: "cos-timeline__block--noshow",
  cancelled: "cos-timeline__block--cancelled",
  open_slot: "cos-timeline__block--open",
  gap: "cos-timeline__block--gap",
};

export function CounselorAppointmentsWorkspace(props: Props) {
  const router = useRouter();
  const [toast, setToast] = useState<{ message: string; tone: "success" | "error" } | null>(null);

  const onDone = useCallback(
    (message: string, err?: boolean) => {
      setToast({ message, tone: err ? "error" : "success" });
      router.refresh();
    },
    [router],
  );

  const future = props.upcoming.filter((a) => !props.today.some((t) => t.id === a.id));

  return (
    <div className="cos-page">
      <header className="cos-page__head">
        <div>
          <h1>جلسات مشاوره</h1>
          <p>درخواست‌های منتظر تأیید، برنامه روزانه و پیگیری جلسات</p>
        </div>
        <Link href="/admin/counselor/calendar" className="cos-btn cos-btn--ghost">
          تقویم
        </Link>
      </header>

      {toast ? <Toast {...toast} /> : null}

      <section className="cos-panel cos-panel--highlight">
        <h2>
          درخواست‌های منتظر تأیید{" "}
          <span className="cos-badge">{toPersianDigits(String(props.pending.length))}</span>
        </h2>
        {props.pending.length === 0 ? (
          <p className="cos-empty">درخواست جدیدی در صف تأیید نیست.</p>
        ) : (
          <ul className="cos-pending-list">
            {props.pending.map((item) => (
              <PendingCard
                key={item.id}
                item={item}
                canViewMobile={props.canViewMobile}
                onDone={onDone}
              />
            ))}
          </ul>
        )}
      </section>

      <section className="cos-panel">
        <h2>
          برنامه امروز · {props.timelineWeekday} · {props.timelineDateLabel}
        </h2>
        {props.timelineBlocks.length === 0 ? (
          <p className="cos-empty">برای امروز جلسه یا نوبت آزادی در تایم‌لاین نیست.</p>
        ) : (
          <ol className="cos-timeline">
            {props.timelineBlocks.map((block) => (
              <li key={block.id} className={`cos-timeline__block ${KIND_CLASS[block.kind]}`}>
                <span className="cos-timeline__time">
                  {block.startLabel}–{block.endLabel}
                </span>
                <div>
                  <strong>{block.title}</strong>
                  <span>{block.subtitle}</span>
                  <em>{block.statusLabel}</em>
                </div>
                {block.appointmentId ? (
                  <Link href={`/admin/counselor/appointments/${block.appointmentId}`} className="cos-link">
                    باز کردن
                  </Link>
                ) : null}
              </li>
            ))}
          </ol>
        )}
      </section>

      {[
        { title: "امروز", items: props.today },
        { title: "آینده", items: future },
      ].map((section) => (
        <section key={section.title} className="cos-panel">
          <h2>{section.title}</h2>
          {section.items.length === 0 ? (
            <p className="cos-empty">موردی نیست.</p>
          ) : (
            <ul className="cos-appointment-list">
              {section.items.map((a) => (
                <li key={a.id}>
                  <div>
                    <Link href={`/admin/counselor/students/${a.studentId}`}>
                      <strong>{a.studentName}</strong>
                    </Link>
                    <span>{a.whenLabel}</span>
                    <em>
                      {a.purposeLabel} · {a.meetingTypeLabel} · {a.statusLabel}
                    </em>
                  </div>
                  <div className="cos-inline-actions">
                    <Link href={`/admin/counselor/appointments/${a.id}`} className="cos-link">
                      جزئیات
                    </Link>
                    <OpenSessionButton appointmentId={a.id} sessionRecordId={a.sessionRecordId} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </div>
  );
}
