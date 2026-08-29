"use client";

import { useActionState } from "react";
import {
  cancelReservationAction,
  checkInReservationAction,
  completeReservationAction,
  confirmReservationAction,
  noShowReservationAction,
  promoteWaitingListAction,
  type BookingActionState,
} from "@/app/admin/(dashboard)/bookings/actions";

const initial: BookingActionState = {};
type Action = typeof cancelReservationAction;
function Button({ label, action, reservationId, danger = false }: { label: string; action: Action; reservationId: string; danger?: boolean }) {
  const [state, formAction, pending] = useActionState(action, initial);
  return <form action={formAction}><input type="hidden" name="reservationId" value={reservationId}/><button disabled={pending} className={`rounded-xl px-3 py-2 text-sm disabled:opacity-50 ${danger ? "border border-red-300 text-red-700" : "border border-border text-foreground"}`}>{pending ? "در حال ثبت…" : label}</button>{state.error ? <p className="mt-1 text-xs text-red-700">{state.error}</p> : state.success ? <p className="mt-1 text-xs text-emerald-700">{state.success}</p> : null}</form>;
}

export function ReservationActions({ reservationId, waiting }: { reservationId: string; waiting: boolean }) {
  return <div className="flex flex-wrap gap-2">
    <Button label="تأیید" action={confirmReservationAction} reservationId={reservationId}/>
    <Button label="ثبت ورود" action={checkInReservationAction} reservationId={reservationId}/>
    <Button label="تکمیل جلسه" action={completeReservationAction} reservationId={reservationId}/>
    <Button label="عدم مراجعه" action={noShowReservationAction} reservationId={reservationId} danger/>
    <Button label="لغو رزرو" action={cancelReservationAction} reservationId={reservationId} danger/>
    {waiting ? <Button label="ارتقا از لیست انتظار" action={promoteWaitingListAction} reservationId={reservationId}/> : null}
  </div>;
}
