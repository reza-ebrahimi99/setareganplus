"use client";

import { useActionState } from "react";
import {
  advanceOrderStageAction,
  type CommerceOrderActionState,
} from "@/app/admin/(dashboard)/commerce/actions";
import type { CommerceStaffOption } from "@/lib/commerce/orders/staff";
import {
  commerceOpsNextActionLabel,
  type CommerceOpsStageValue,
} from "@/lib/commerce/orders/ops-stage";

const empty: CommerceOrderActionState = {};

type Props = {
  orderId: string;
  opsStage: CommerceOpsStageValue;
  paymentPaid: boolean;
  canManage: boolean;
  staff: readonly CommerceStaffOption[];
  defaultHandoverStaffUserId?: string | null;
  compact?: boolean;
  large?: boolean;
  showSignature?: boolean;
  from?: string;
};

export function OrderNextAction({
  orderId,
  opsStage,
  paymentPaid,
  canManage,
  staff,
  defaultHandoverStaffUserId = null,
  compact = false,
  large = false,
  showSignature = false,
  from,
}: Props) {
  const [state, action, pending] = useActionState(advanceOrderStageAction, empty);
  const nextLabel = commerceOpsNextActionLabel(opsStage);
  const burst = Boolean(state.successMessage) && opsStage === "READY_FOR_PICKUP";

  if (state.successMessage && !nextLabel) {
    return (
      <p className="text-xs text-success">
        {state.successMessage}
        {burst ? <ConfettiBurst /> : null}
      </p>
    );
  }
  if (!canManage || !nextLabel) return null;

  const needsStaff = opsStage === "READY_FOR_PICKUP";
  const waitingPay = opsStage === "REGISTERED" && !paymentPaid;
  const buttonClass = large
    ? "min-h-12 w-full rounded-2xl px-4 text-sm font-semibold text-white disabled:opacity-60"
    : compact
      ? "min-h-10 rounded-xl px-3 text-xs font-semibold text-white disabled:opacity-60"
      : "min-h-11 rounded-xl px-4 text-sm font-semibold text-white disabled:opacity-60";

  return (
    <form
      action={action}
      onClick={(event) => event.stopPropagation()}
      className={compact ? "flex min-w-[10rem] flex-col gap-1.5" : "flex w-full flex-col gap-2"}
    >
      <input type="hidden" name="orderId" value={orderId} />
      {from ? <input type="hidden" name="from" value={from} /> : null}
      {needsStaff ? (
        <select
          name="handoverStaffUserId"
          required
          defaultValue={defaultHandoverStaffUserId ?? ""}
          className="min-h-10 w-full rounded-xl border border-border bg-background px-2.5 text-xs"
        >
          <option value="">مسئول تحویل</option>
          {staff.map((member) => (
            <option key={member.id} value={member.id}>
              {member.name}
            </option>
          ))}
        </select>
      ) : null}
      {showSignature ? (
        <input
          name="pickupSignedBy"
          placeholder="امضا / نام تحویل‌گیرنده (اختیاری)"
          className="min-h-11 w-full rounded-xl border border-border bg-background px-3 text-sm"
        />
      ) : null}
      {state.formError ? (
        <p className="text-[11px] text-danger" role="alert">
          {state.formError}
        </p>
      ) : null}
      {burst ? <ConfettiBurst /> : null}
      <button
        id={`ops-next-${orderId}`}
        type="submit"
        disabled={pending}
        className={`${buttonClass} ${waitingPay ? "bg-sky-700" : "bg-primary"}`}
      >
        {pending ? "در حال ثبت…" : nextLabel}
      </button>
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
