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
};

export function OrderNextAction({
  orderId,
  opsStage,
  paymentPaid,
  canManage,
  staff,
  defaultHandoverStaffUserId = null,
  compact = false,
}: Props) {
  const [state, action, pending] = useActionState(advanceOrderStageAction, empty);
  const nextLabel = commerceOpsNextActionLabel(opsStage);
  if (!canManage || !nextLabel) return null;

  const needsStaff = opsStage === "READY_FOR_PICKUP";
  const waitingPay = opsStage === "REGISTERED" && !paymentPaid;

  return (
    <form
      action={action}
      onClick={(event) => event.stopPropagation()}
      className={compact ? "flex min-w-[10rem] flex-col gap-1.5" : "flex flex-wrap items-end gap-2"}
    >
      <input type="hidden" name="orderId" value={orderId} />
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
      {state.formError ? (
        <p className="text-[11px] text-danger" role="alert">
          {state.formError}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className={`min-h-10 rounded-xl px-3 text-xs font-semibold text-white disabled:opacity-60 ${
          waitingPay ? "bg-sky-700" : "bg-primary"
        }`}
      >
        {pending ? "در حال ثبت…" : nextLabel}
      </button>
    </form>
  );
}
