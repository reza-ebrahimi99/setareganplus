"use client";

/**
 * Guidance Journey Engine — shared Save Draft / Continue action row.
 */

import Link from "next/link";
import { useFormStatus } from "react-dom";
import { PortalIcon } from "@/components/portal/icons";

type GuidanceStepActionsProps = {
  continueDisabled?: boolean;
  continueLabel?: string;
  showSaveDraft?: boolean;
  onSaveDraft?: () => void;
  savingDraft?: boolean;
  backHref?: string;
  backLabel?: string;
  onContinue?: () => void;
  continueType?: "submit" | "button";
};

export function GuidanceStepActions({
  continueDisabled = false,
  continueLabel = "ادامه",
  showSaveDraft = true,
  onSaveDraft,
  savingDraft = false,
  backHref,
  backLabel = "بازگشت",
  onContinue,
  continueType = "submit",
}: GuidanceStepActionsProps) {
  const { pending } = useFormStatus();
  const busy = pending || savingDraft;

  return (
    <div className="gpj-actions">
      <div className="gpj-actions__start">
        {showSaveDraft ? (
          <button
            type="button"
            className="gpj-actions__draft"
            onClick={onSaveDraft}
            disabled={busy}
          >
            {savingDraft ? "در حال ذخیره…" : "ذخیره پیش‌نویس"}
          </button>
        ) : backHref ? (
          <Link href={backHref} className="gpj-actions__back">
            <PortalIcon name="route" className="size-4" aria-hidden="true" />
            {backLabel}
          </Link>
        ) : (
          <span className="gpj-actions__spacer" aria-hidden="true" />
        )}
      </div>

      {continueType === "button" ? (
        <button
          type="button"
          className="gpj-actions__continue"
          disabled={continueDisabled || busy}
          onClick={onContinue}
        >
          {busy ? "در حال ثبت…" : continueLabel}
        </button>
      ) : (
        <button
          type="submit"
          className="gpj-actions__continue"
          disabled={continueDisabled || busy}
        >
          {pending ? "در حال ثبت…" : continueLabel}
        </button>
      )}
    </div>
  );
}
