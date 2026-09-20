"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  confirmCounselorAppointmentAction,
  rejectCounselorAppointmentAction,
} from "@/app/admin/counselor/appointment-actions";
import type { CounselorAppointmentDetail } from "@/lib/counselor-os/appointments";

export function AppointmentDetailActions(props: { appointment: CounselorAppointmentDetail }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  if (!props.appointment.needsConfirmation) {
    return null;
  }

  const run = (fn: () => Promise<{ error?: string; success?: string }>) => {
    start(async () => {
      const res = await fn();
      setMessage(res.error ?? res.success ?? null);
      router.refresh();
    });
  };

  return (
    <section className="cos-panel cos-panel--highlight">
      <h2>تأیید یا رد درخواست</h2>
      {message ? <p className="cos-muted">{message}</p> : null}
      <div className="cos-inline-actions">
        <button
          type="button"
          className="cos-btn cos-btn--primary"
          disabled={pending}
          onClick={() => run(() => confirmCounselorAppointmentAction(props.appointment.id))}
        >
          تأیید جلسه
        </button>
      </div>
      <label style={{ display: "block", marginTop: "1rem" }}>
        علت رد
        <textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} rows={2} />
      </label>
      <button
        type="button"
        className="cos-btn cos-btn--ghost"
        disabled={pending}
        onClick={() =>
          run(() => rejectCounselorAppointmentAction(props.appointment.id, rejectReason))
        }
      >
        رد درخواست
      </button>
    </section>
  );
}
