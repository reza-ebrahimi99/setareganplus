"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, useTransition } from "react";
import {
  changeLeadStageAction,
  type ChangeLeadStageActionResult,
} from "@/app/admin/(dashboard)/leads/actions";
import type { CrmStageType } from "@/generated/prisma/enums";
import type { TerminalStageStatus } from "@/lib/crm/stage-transition";

export type LeadStageOption = {
  id: string;
  name: string;
  stageType: CrmStageType;
  isTerminal: boolean;
};

type Props = {
  leadId: string;
  currentStageId: string | null;
  stages: readonly LeadStageOption[];
  canMarkTerminal: boolean;
  compact?: boolean;
};

const TERMINAL_COPY: Record<
  TerminalStageStatus,
  { title: string; message: string; confirm: string }
> = {
  WON: {
    title: "تأیید ثبت‌نام مخاطب",
    message: "آیا از تغییر وضعیت این مخاطب به ثبت‌نام شده اطمینان دارید؟",
    confirm: "بله، ثبت‌نام شد",
  },
  LOST: {
    title: "تأیید از دست رفتن مخاطب",
    message: "آیا از تغییر وضعیت این مخاطب به از دست رفته اطمینان دارید؟",
    confirm: "بله، تغییر وضعیت بده",
  },
};

export function LeadStageControl({
  leadId,
  currentStageId,
  stages,
  canMarkTerminal,
  compact = false,
}: Props) {
  const router = useRouter();
  const titleId = useId();
  const confirmButtonRef = useRef<HTMLButtonElement>(null);
  const [pending, startTransition] = useTransition();
  const [selectedStageId, setSelectedStageId] = useState(currentStageId ?? "");
  const [appliedStageId, setAppliedStageId] = useState(currentStageId ?? "");
  const [confirmedStageId, setConfirmedStageId] = useState<string | null>(null);
  const [terminalStatus, setTerminalStatus] =
    useState<TerminalStageStatus | null>(null);
  const [toast, setToast] = useState<{
    tone: "success" | "error";
    message: string;
  } | null>(null);

  useEffect(() => {
    if (!terminalStatus) return;
    confirmButtonRef.current?.focus();
  }, [terminalStatus]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 3500);
    return () => window.clearTimeout(timer);
  }, [toast]);

  function submit(stageId: string, terminalConfirmed: boolean) {
    if (!stageId || pending) return;
    const formData = new FormData();
    formData.set("leadId", leadId);
    formData.set("stageId", stageId);
    if (terminalConfirmed) formData.set("terminalConfirmed", "true");

    startTransition(async () => {
      let result: ChangeLeadStageActionResult;
      try {
        result = await changeLeadStageAction(formData);
      } catch (error) {
        console.error("Lead stage request failed in browser", error);
        setToast({
          tone: "error",
          message: "ارتباط با سرور برقرار نشد. دوباره تلاش کنید.",
        });
        return;
      }

      if (!result.ok && result.requiresConfirmation) {
        setConfirmedStageId(stageId);
        setTerminalStatus(result.terminalStatus);
        return;
      }
      if (!result.ok) {
        setSelectedStageId(appliedStageId);
        setToast({ tone: "error", message: result.error });
        return;
      }

      setTerminalStatus(null);
      setConfirmedStageId(null);
      setSelectedStageId(result.stageId);
      setAppliedStageId(result.stageId);
      setToast({ tone: "success", message: result.message });
      router.refresh();
    });
  }

  function cancelConfirmation() {
    if (pending) return;
    setTerminalStatus(null);
    setConfirmedStageId(null);
    setSelectedStageId(appliedStageId);
  }

  const copy = terminalStatus ? TERMINAL_COPY[terminalStatus] : null;

  return (
    <>
      <div className={compact ? "mt-2" : "space-y-2 border-t border-border pt-3"}>
        {!compact ? (
          <label htmlFor={`stage-${leadId}`} className="block text-sm">
            <span className="mb-1 block text-muted">تغییر مرحله</span>
          </label>
        ) : (
          <label className="sr-only" htmlFor={`stage-${leadId}`}>
            تغییر مرحله
          </label>
        )}
        <select
          id={`stage-${leadId}`}
          value={selectedStageId}
          disabled={pending}
          onChange={(event) => setSelectedStageId(event.target.value)}
          className={
            compact
              ? "w-full rounded border border-border px-2 py-1 text-xs"
              : "w-full rounded-lg border border-border px-3 py-2 text-sm"
          }
        >
          {stages.map((stage) => (
            <option
              key={stage.id}
              value={stage.id}
              disabled={stage.isTerminal && !canMarkTerminal}
            >
              {stage.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          disabled={pending || !selectedStageId || selectedStageId === appliedStageId}
          onClick={() => submit(selectedStageId, false)}
          className={
            compact
              ? "mt-1 w-full rounded bg-primary/90 px-2 py-1 text-xs text-white disabled:opacity-50"
              : "rounded-lg bg-primary px-3 py-2 text-sm text-white disabled:opacity-50"
          }
        >
          {pending ? "در حال ثبت…" : compact ? "انتقال مرحله" : "ذخیره مرحله"}
        </button>
      </div>

      {copy && terminalStatus ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) cancelConfirmation();
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            dir="rtl"
            className="w-full max-w-md rounded-2xl border border-border bg-white p-5 shadow-2xl sm:p-6"
            onKeyDown={(event) => {
              if (event.key === "Escape") cancelConfirmation();
            }}
          >
            <h2 id={titleId} className="text-lg font-bold text-primary">
              {copy.title}
            </h2>
            <p className="mt-3 text-sm leading-7 text-foreground">{copy.message}</p>
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={pending}
                onClick={cancelConfirmation}
                className="rounded-xl border border-border px-4 py-2.5 text-sm disabled:opacity-50"
              >
                انصراف
              </button>
              <button
                ref={confirmButtonRef}
                type="button"
                disabled={pending || !confirmedStageId}
                onClick={() => {
                  if (confirmedStageId) submit(confirmedStageId, true);
                }}
                className={`rounded-xl px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50 ${
                  terminalStatus === "LOST" ? "bg-red-700" : "bg-emerald-700"
                }`}
              >
                {pending ? "در حال ثبت…" : copy.confirm}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {toast ? (
        <div
          role={toast.tone === "error" ? "alert" : "status"}
          dir="rtl"
          className={`fixed bottom-5 start-5 z-[60] max-w-sm rounded-xl border px-4 py-3 text-sm shadow-lg ${
            toast.tone === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-900"
              : "border-red-200 bg-red-50 text-red-800"
          }`}
        >
          {toast.message}
        </div>
      ) : null}
    </>
  );
}
