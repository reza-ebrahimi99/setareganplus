"use client";

/**
 * Guidance package checkout — discount code presentation (UI only).
 * Does not alter payment intent amounts or server checkout logic.
 */

import { useState } from "react";
import { PortalIcon } from "@/components/portal/icons";

type GuidanceDiscountCodeFieldProps = {
  selectedPackageTitle?: string | null;
};

export function GuidanceDiscountCodeField({
  selectedPackageTitle = null,
}: GuidanceDiscountCodeFieldProps) {
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<"idle" | "applied" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  function handleApply() {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) {
      setStatus("error");
      setMessage("لطفاً کد تخفیف را وارد کنید.");
      return;
    }
    setStatus("applied");
    setMessage(
      "کد ثبت شد. در صورت معتبر بودن، تخفیف هنگام پرداخت در درگاه اعمال می‌شود.",
    );
  }

  return (
    <section className="gp-discount" aria-labelledby="gp-discount-title">
      <div className="gp-discount__head">
        <h2 id="gp-discount-title">کد تخفیف</h2>
        {selectedPackageTitle ? (
          <p className="gp-discount__selected">
            بسته انتخابی: <strong>{selectedPackageTitle}</strong>
          </p>
        ) : null}
      </div>

      <div className="gp-discount__row">
        <label className="gp-discount__field" htmlFor="guidance-discount-code">
          <span className="sr-only">کد تخفیف</span>
          <input
            id="guidance-discount-code"
            type="text"
            inputMode="text"
            autoComplete="off"
            value={code}
            onChange={(event) => {
              setCode(event.target.value.toUpperCase());
              if (status !== "idle") {
                setStatus("idle");
                setMessage(null);
              }
            }}
            placeholder="کد تخفیف خود را وارد کنید"
            aria-invalid={status === "error"}
          />
        </label>
        <button
          type="button"
          className="gp-discount__apply"
          onClick={handleApply}
          disabled={!code.trim()}
        >
          <PortalIcon name="spark" className="size-4" aria-hidden="true" />
          اعمال کد تخفیف
        </button>
      </div>

      {message ? (
        <p
          className={
            status === "error" ? "gp-discount__message gp-discount__message--error" : "gp-discount__message gp-discount__message--success"
          }
          role={status === "error" ? "alert" : "status"}
        >
          {message}
        </p>
      ) : (
        <p className="gp-discount__hint">در صورت داشتن کد ویژه، قبل از پرداخت وارد کنید.</p>
      )}
    </section>
  );
}
