"use client";
import { useFormStatus } from "react-dom";

/** Per-row «next stage» button in the orders table. Shows progress and blocks double clicks while saving. */
export function StageButton({ value, children }: { value: string; children: React.ReactNode }) {
  const { pending, data } = useFormStatus();
  const mine = pending && data?.get("one") === value;
  return (
    <button
      name="one"
      value={value}
      disabled={pending}
      aria-busy={mine}
      className="whitespace-nowrap rounded-full border border-line px-3 py-1 text-xs font-semibold hover:border-navy hover:bg-navy hover:text-white disabled:cursor-wait disabled:opacity-60"
    >
      {mine ? "در حال ثبت…" : children}
    </button>
  );
}
