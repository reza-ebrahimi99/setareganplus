"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { openSessionFromAppointmentAction } from "@/app/admin/counselor/actions";

export function OpenSessionButton({
  appointmentId,
  sessionRecordId,
  label = "ثبت نتیجه جلسه",
}: {
  appointmentId: string;
  sessionRecordId: string | null;
  label?: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  if (sessionRecordId) {
    return (
      <a href={`/admin/counselor/sessions/${sessionRecordId}`} className="cos-btn cos-btn--primary">
        ادامه ثبت جلسه
      </a>
    );
  }

  return (
    <button
      type="button"
      className="cos-btn cos-btn--primary"
      disabled={pending}
      onClick={() => {
        start(async () => {
          const href = await openSessionFromAppointmentAction(appointmentId);
          router.push(href);
        });
      }}
    >
      {pending ? "در حال باز کردن…" : label}
    </button>
  );
}
