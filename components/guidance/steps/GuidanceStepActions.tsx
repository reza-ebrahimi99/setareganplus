"use client";

/**
 * Guidance Journey Engine — shared Save Draft / Continue action row.
 */

import { useFormStatus } from "react-dom";

type GuidanceStepActionsProps = {
  continueDisabled?: boolean;
  continueLabel?: string;
  showSaveDraft?: boolean;
  onSaveDraft?: () => void;
  savingDraft?: boolean;
};

export function GuidanceStepActions({
  continueDisabled = false,
  continueLabel = "ادامه",
  showSaveDraft = true,
  onSaveDraft,
  savingDraft = false,
}: GuidanceStepActionsProps) {
  const { pending } = useFormStatus();

  return (
    <div className="gpj-actions">
      {showSaveDraft ? (
        <button
          type="button"
          className="gpj-actions__draft"
          onClick={onSaveDraft}
          disabled={savingDraft || pending}
        >
          {savingDraft ? "در حال ذخیره…" : "ذخیره پیش‌نویس"}
        </button>
      ) : (
        <span />
      )}
      <button
        type="submit"
        className="gpj-actions__continue"
        disabled={continueDisabled || pending}
      >
        {pending ? "در حال ثبت…" : continueLabel}
      </button>
    </div>
  );
}
