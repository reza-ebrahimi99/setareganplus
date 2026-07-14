"use client";

import { useActionState } from "react";
import {
  loginAdminAction,
  type LoginState,
} from "@/app/admin/login/actions";

const initialState: LoginState = {};

export function AdminLoginForm({ nextPath }: { nextPath?: string }) {
  const [state, formAction, pending] = useActionState(
    loginAdminAction,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-4" noValidate>
      {nextPath ? <input type="hidden" name="next" value={nextPath} /> : null}

      {state.formError ? (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-7 text-red-800"
        >
          {state.formError}
        </div>
      ) : null}

      <div>
        <label
          htmlFor="identifier"
          className="text-sm font-medium text-primary"
        >
          ایمیل یا موبایل
        </label>
        <input
          id="identifier"
          name="identifier"
          type="text"
          required
          autoComplete="username"
          dir="ltr"
          className="mt-1.5 w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
        />
      </div>

      <div>
        <label htmlFor="password" className="text-sm font-medium text-primary">
          رمز عبور
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="mt-1.5 w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="inline-flex w-full items-center justify-center rounded-xl bg-primary px-5 py-3 text-sm font-medium text-white shadow-sm hover:bg-primary/92 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "در حال ورود…" : "ورود"}
      </button>

      <p className="text-xs leading-6 text-muted">
        {/* TODO(auth): password recovery */}
        بازیابی رمز عبور هنوز فعال نیست.
      </p>
    </form>
  );
}
