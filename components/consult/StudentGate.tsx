"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { enterWithCode } from "@/app/(site)/moshavere-vizhe/actions";

export function StudentGate() {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const router = useRouter();

  return (
    <form
      className="card mx-auto max-w-md p-6 sm:p-8"
      onSubmit={(e) => {
        e.preventDefault();
        setError("");
        start(async () => {
          const res = await enterWithCode(code);
          if (!res.ok) {
            setError(res.error);
            return;
          }
          router.refresh();
        });
      }}
    >
      <label className="block" htmlFor="student-code">
        <span className="label">کد دانش‌آموزی</span>
        <input
          id="student-code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          dir="ltr"
          className="input text-center text-lg tracking-[0.25em]"
          placeholder="ABCDE-23456"
          aria-describedby="code-help"
        />
      </label>
      <p id="code-help" className="mt-2 text-xs leading-6 text-muted">
        کد را از آموزشگاه گرفته‌اید. امتحان کردن کدهای دیگران این صفحه را موقتاً می‌بندد و فهرست دانش‌آموزان اینجا دیده نمی‌شود.
      </p>
      {error && <p role="alert" className="mt-3 rounded-xl bg-gc-soft px-3 py-2 text-sm font-semibold text-gc">{error}</p>}
      <button className="btn-gold mt-5 w-full" disabled={pending || code.trim().length < 8}>
        {pending ? "در حال بررسی…" : "ادامه"}
      </button>
    </form>
  );
}
