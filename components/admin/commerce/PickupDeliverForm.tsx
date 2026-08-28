"use client";

import { useActionState, useRef } from "react";
import {
  advanceOrderStageAction,
  type CommerceOrderActionState,
} from "@/app/admin/(dashboard)/commerce/actions";
import { PickupSignaturePad } from "@/components/admin/commerce/PickupSignaturePad";
import type { CommerceStaffOption } from "@/lib/commerce/orders/staff";

const empty: CommerceOrderActionState = {};

type Props = {
  orderId: string;
  qrToken: string;
  staff: readonly CommerceStaffOption[];
  defaultHandoverStaffUserId: string;
  canChangeStaff: boolean;
  enabled: boolean;
};

export function PickupDeliverForm({
  orderId,
  qrToken,
  staff,
  defaultHandoverStaffUserId,
  canChangeStaff,
  enabled,
}: Props) {
  const [state, action, pending] = useActionState(advanceOrderStageAction, empty);
  const formRef = useRef<HTMLFormElement | null>(null);
  const startX = useRef<number | null>(null);
  const burst = Boolean(state.successMessage);

  if (state.successMessage) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-5 text-center text-emerald-950">
        <p className="text-lg font-bold">تحویل ثبت شد</p>
        <p className="mt-1 text-sm">{state.successMessage}</p>
        {burst ? <ConfettiBurst /> : null}
      </div>
    );
  }

  return (
    <form ref={formRef} action={action} className="space-y-3">
      <input type="hidden" name="orderId" value={orderId} />
      <input type="hidden" name="from" value={`/admin/commerce/pickup/${encodeURIComponent(qrToken)}`} />
      {canChangeStaff ? (
        <label className="block text-sm">
          <span className="mb-1 block text-muted">مسئول تحویل</span>
          <select
            name="handoverStaffUserId"
            required
            defaultValue={defaultHandoverStaffUserId}
            disabled={!enabled || pending}
            className="min-h-12 w-full rounded-2xl border border-border bg-background px-3"
          >
            {staff.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <p className="text-sm text-muted">
          مسئول تحویل: {staff.find((member) => member.id === defaultHandoverStaffUserId)?.name ?? "شما"}
          <input type="hidden" name="handoverStaffUserId" value={defaultHandoverStaffUserId} />
        </p>
      )}
      <PickupSignaturePad disabled={!enabled || pending} />
      {state.formError ? (
        <p className="text-sm text-danger" role="alert">
          {state.formError}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={!enabled || pending || !defaultHandoverStaffUserId}
        onPointerDown={(event) => {
          startX.current = event.clientX;
        }}
        onPointerUp={(event) => {
          if (startX.current == null) return;
          const delta = startX.current - event.clientX;
          startX.current = null;
          if (delta > 72 && enabled && !pending) {
            formRef.current?.requestSubmit();
          }
        }}
        className="pickup-deliver-btn min-h-14 w-full rounded-2xl bg-emerald-700 px-4 text-base font-bold text-white disabled:opacity-50"
      >
        {pending ? "در حال ثبت…" : "تحویل داده شد"}
      </button>
      <p className="text-center text-[11px] text-muted sm:hidden">برای تحویل، دکمه را بزنید یا به چپ بکشید</p>
    </form>
  );
}

function ConfettiBurst() {
  return (
    <span className="ops-confetti" aria-hidden="true">
      {Array.from({ length: 8 }, (_, index) => (
        <i key={index} style={{ insetInlineStart: `${12 + index * 10}%`, animationDelay: `${index * 40}ms` }} />
      ))}
    </span>
  );
}
