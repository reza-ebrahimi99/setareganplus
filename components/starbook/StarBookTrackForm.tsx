"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { pushStarBookTrack } from "@/lib/commerce/starbook/store";

export function StarBookTrackForm() {
  const router = useRouter();
  const [code, setCode] = useState("");

  return (
    <form
      className="space-y-3"
      onSubmit={(event) => {
        event.preventDefault();
        const token = code.trim();
        if (!token) return;
        pushStarBookTrack(token);
        router.push(`/booklet/${encodeURIComponent(token)}`);
      }}
    >
      <label className="block text-sm">
        <span className="mb-2 block text-[var(--sb-muted)]">کد پیگیری</span>
        <input
          value={code}
          onChange={(event) => setCode(event.target.value)}
          className="starbook-input"
          placeholder="مثلاً A1B2C3"
          dir="ltr"
        />
      </label>
      <button type="submit" className="starbook-btn starbook-btn-primary w-full">
        نمایش رسید
      </button>
    </form>
  );
}
