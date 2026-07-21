"use client";

import { useFormStatus } from "react-dom";
import { importHomepageQalamchiCardsAction } from "@/app/admin/(dashboard)/website/marketing-cards/actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-xl border border-secondary/40 bg-secondary/15 px-4 py-2.5 text-sm font-medium text-primary disabled:opacity-60"
    >
      {pending ? "در حال درون‌ریزی…" : "Import Existing Cards"}
    </button>
  );
}

export function ImportLegacyMarketingCardsButton() {
  return (
    <form action={importHomepageQalamchiCardsAction}>
      <SubmitButton />
    </form>
  );
}
