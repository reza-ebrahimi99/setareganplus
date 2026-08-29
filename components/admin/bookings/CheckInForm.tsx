"use client";

import { useActionState, useEffect, useRef } from "react";
import { checkInReservationAction, type BookingActionState } from "@/app/admin/(dashboard)/bookings/actions";

export function CheckInForm({ token }: { token?: string }) {
  const [state, action, pending] = useActionState(checkInReservationAction, {} as BookingActionState);
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (token) formRef.current?.requestSubmit();
  }, [token]);
  return <form ref={formRef} action={action} className="admin-card max-w-xl space-y-4 p-5">
    <label className="block text-sm font-medium text-primary">توکن QR یا شناسه رزرو<input name={token ? "token" : "reservationId"} defaultValue={token ?? ""} required dir="ltr" className="mt-2 w-full rounded-xl border border-border px-3 py-2 text-sm" /></label>
    {state.error ? <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{state.error}</p> : null}
    {state.success ? <p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">ورود با موفقیت ثبت شد.</p> : null}
    <button disabled={pending} className="rounded-xl bg-primary px-5 py-2.5 text-sm text-white">{pending ? "در حال ثبت…" : "ثبت ورود"}</button>
  </form>;
}
