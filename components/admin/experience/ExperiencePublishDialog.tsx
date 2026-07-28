"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useMemo, useRef } from "react";
import {
  publishExperienceAction,
  validatePublishExperienceAction,
  type ExperiencePublishActionState,
} from "@/app/admin/(dashboard)/registrations/flows/[id]/experience/actions";
import { getBlockDefinition, isExperienceBlockType } from "@/lib/experience/registry";
import type { ExperienceIssue } from "@/lib/experience/service/types";
import { toPersianDigits } from "@/lib/persian";

const emptyState: ExperiencePublishActionState = {};

type ExperiencePublishDialogProps = {
  open: boolean;
  onClose: () => void;
  flowId: string;
  experienceId: string;
  draftVersionId: string;
};

function groupIssues(issues: ExperienceIssue[]) {
  const groups = new Map<
    string,
    { blockId?: string; blockType?: string; label: string; items: ExperienceIssue[] }
  >();

  for (const issue of issues) {
    const key = issue.blockId
      ? `block:${issue.blockId}`
      : issue.path
        ? `path:${issue.path}`
        : `code:${issue.code}`;
    const existing = groups.get(key);
    if (existing) {
      existing.items.push(issue);
      continue;
    }

    let label = "عمومی";
    if (issue.blockType && isExperienceBlockType(issue.blockType)) {
      label = getBlockDefinition(issue.blockType).labelFa;
    } else if (issue.blockType) {
      label = issue.blockType;
    } else if (issue.path) {
      label = issue.path;
    }

    groups.set(key, {
      blockId: issue.blockId,
      blockType: issue.blockType,
      label,
      items: [issue],
    });
  }

  return [...groups.values()];
}

export function ExperiencePublishDialog({
  open,
  onClose,
  flowId,
  experienceId,
  draftVersionId,
}: ExperiencePublishDialogProps) {
  const router = useRouter();
  const [validateState, validateAction, validatePending] = useActionState(
    validatePublishExperienceAction,
    emptyState,
  );
  const [publishState, publishAction, publishPending] = useActionState(
    publishExperienceAction,
    emptyState,
  );
  const validatedOnce = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!open) {
      validatedOnce.current = false;
      return;
    }
    if (validatedOnce.current) return;
    validatedOnce.current = true;
    formRef.current?.requestSubmit();
  }, [open]);

  useEffect(() => {
    if (!publishState.published) return;
    router.refresh();
  }, [publishState.published, router]);

  const issues = useMemo(
    () => publishState.issues ?? validateState.issues ?? [],
    [publishState.issues, validateState.issues],
  );
  const grouped = useMemo(() => groupIssues(issues), [issues]);
  const canPublish =
    validateState.validated === true &&
    !validatePending &&
    !publishPending &&
    !publishState.published;
  const busy = validatePending || publishPending;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-3 sm:items-center">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="experience-publish-title"
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-border bg-white p-4 shadow-xl sm:p-5"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2
              id="experience-publish-title"
              className="text-base font-semibold text-primary"
            >
              انتشار تجربه
            </h2>
            <p className="mt-1 text-xs leading-6 text-muted">
              صفحه زنده تا انتشار موفق تغییر نمی‌کند. ابتدا اعتبارسنجی انجام
              می‌شود و فقط در صورت آمادگی می‌توانید تأیید کنید.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="min-h-11 rounded-xl border border-border px-3 text-sm disabled:opacity-60"
          >
            بستن
          </button>
        </div>

        <form ref={formRef} action={validateAction} className="mt-4 space-y-3">
          <input type="hidden" name="flowId" value={flowId} />
          <input type="hidden" name="experienceId" value={experienceId} />
          <input type="hidden" name="draftVersionId" value={draftVersionId} />
          <button
            type="submit"
            disabled={busy}
            className="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-border bg-white px-4 text-sm disabled:opacity-60 sm:w-auto"
          >
            {validatePending ? "در حال اعتبارسنجی..." : "اعتبارسنجی دوباره"}
          </button>
        </form>

        {validateState.formError || publishState.formError ? (
          <div
            role="alert"
            className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm leading-7 text-red-800"
          >
            {publishState.formError ?? validateState.formError}
          </div>
        ) : null}

        {validateState.successMessage || publishState.successMessage ? (
          <div
            role="status"
            className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm leading-7 text-emerald-900"
          >
            {publishState.successMessage ?? validateState.successMessage}
          </div>
        ) : null}

        {grouped.length > 0 ? (
          <div className="mt-4 space-y-3">
            <p className="text-sm font-medium text-primary">
              {toPersianDigits(issues.length)} مورد نیاز به بررسی
            </p>
            {grouped.map((group) => (
              <div
                key={`${group.blockId ?? ""}-${group.label}`}
                className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2"
              >
                <p className="text-sm font-medium text-amber-950">
                  {group.label}
                  {group.blockType ? (
                    <span className="mr-2 text-xs text-amber-800">
                      ({group.blockType})
                    </span>
                  ) : null}
                </p>
                <ul className="mt-1 list-disc space-y-1 pr-5 text-sm leading-6 text-amber-950">
                  {group.items.map((item, index) => (
                    <li key={`${item.code}-${item.message}-${index}`}>
                      {item.message}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        ) : null}

        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-border bg-white px-4 text-sm disabled:opacity-60"
          >
            {publishState.published ? "بستن" : "انصراف"}
          </button>
          {!publishState.published ? (
            <form action={publishAction}>
              <input type="hidden" name="flowId" value={flowId} />
              <input type="hidden" name="experienceId" value={experienceId} />
              <input
                type="hidden"
                name="draftVersionId"
                value={draftVersionId}
              />
              <button
                type="submit"
                disabled={!canPublish}
                className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-primary px-4 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {publishPending ? "در حال انتشار..." : "تأیید انتشار"}
              </button>
            </form>
          ) : null}
        </div>
      </div>
    </div>
  );
}
