"use client";

/**
 * Shared OTP submit control — must be a descendant of <form> for useFormStatus.
 * Explicit type="submit" so iOS/Android always post the form (never type=button).
 */

import { useFormStatus } from "react-dom";

type OtpSubmitButtonProps = {
  idleLabel: string;
  pendingLabel: string;
  className?: string;
};

export function OtpSubmitButton({
  idleLabel,
  pendingLabel,
  className = "inline-flex w-full min-h-12 touch-manipulation items-center justify-center rounded-xl bg-primary px-5 py-3 text-sm font-medium text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-60",
}: OtpSubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className={className}
    >
      {pending ? pendingLabel : idleLabel}
    </button>
  );
}
