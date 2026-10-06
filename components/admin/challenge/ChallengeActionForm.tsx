"use client";

import {
  useActionState,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import type { ChallengeAdminActionState } from "@/app/admin/(dashboard)/challenges/actions";

const initialState: ChallengeAdminActionState = {
  status: "idle",
  message: "",
};

type Props = {
  action: (
    previousState: ChallengeAdminActionState,
    formData: FormData,
  ) => Promise<ChallengeAdminActionState>;
  children: ReactNode;
  className?: string;
  submitLabel: string;
  pendingLabel?: string;
  submitClassName?: string;
  resetOnSuccess?: boolean;
};

export function ChallengeActionForm({
  action,
  children,
  className,
  submitLabel,
  pendingLabel = "در حال ذخیره…",
  submitClassName = "rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white",
  resetOnSuccess = false,
}: Props) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (resetOnSuccess && state.status === "success") {
      formRef.current?.reset();
    }
  }, [resetOnSuccess, state.status]);

  return (
    <form ref={formRef} action={formAction} className={className}>
      {state.status === "error" ? (
        <div
          role="alert"
          className="col-span-full rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-7 text-red-800"
        >
          {state.message}
        </div>
      ) : null}
      {state.status === "success" ? (
        <div
          role="status"
          className="col-span-full rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-7 text-emerald-900"
        >
          {state.message}
        </div>
      ) : null}

      {children}

      <button type="submit" disabled={pending} className={`${submitClassName} disabled:cursor-wait disabled:opacity-60`}>
        {pending ? pendingLabel : submitLabel}
      </button>
    </form>
  );
}
