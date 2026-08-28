"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function PickupLookupForm({ initialToken = "" }: { initialToken?: string }) {
  const router = useRouter();
  const [token, setToken] = useState(initialToken);

  return (
    <form
      className="mx-auto max-w-lg space-y-4 rounded-2xl border border-border bg-surface p-5"
      onSubmit={(event) => {
        event.preventDefault();
        const value = token.trim();
        if (!value) return;
        router.push(`/admin/commerce/pickup/${encodeURIComponent(value)}`);
      }}
    >
      <label className="block text-sm">
        <span className="mb-1.5 block text-muted">اسکن QR یا ورود کد</span>
        <input
          value={token}
          onChange={(event) => setToken(event.target.value)}
          autoFocus
          dir="ltr"
          placeholder="کد QR سفارش"
          className="min-h-14 w-full rounded-2xl border border-border bg-background px-4 text-lg"
        />
      </label>
      <button type="submit" className="min-h-14 w-full rounded-2xl bg-primary text-base font-semibold text-white">
        نمایش سفارش
      </button>
    </form>
  );
}
