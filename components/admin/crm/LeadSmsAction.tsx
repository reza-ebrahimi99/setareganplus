"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState, useTransition } from "react";
import {
  resendFailedLeadSmsAction,
  sendLeadSmsAction,
} from "@/app/admin/(dashboard)/leads/sms-actions";
import type { CrmSmsTemplateOption } from "@/lib/crm/manual-sms";
import { renderSmsTemplate } from "@/lib/communication/template";

type Toast = { tone: "success" | "error"; message: string };

function SmsToast({ toast }: { toast: Toast }) {
  return (
    <div
      role={toast.tone === "error" ? "alert" : "status"}
      dir="rtl"
      className={`fixed bottom-5 start-5 z-[70] max-w-sm rounded-xl border px-4 py-3 text-sm shadow-lg ${
        toast.tone === "success"
          ? "border-emerald-200 bg-emerald-50 text-emerald-900"
          : "border-red-200 bg-red-50 text-red-800"
      }`}
    >
      {toast.message}
    </div>
  );
}

export function LeadSmsAction({
  leadId,
  leadName,
  mobile,
  mobileValid,
  templates,
  compact = false,
}: {
  leadId: string;
  leadName: string;
  mobile: string;
  mobileValid: boolean;
  templates: readonly CrmSmsTemplateOption[];
  compact?: boolean;
}) {
  const router = useRouter();
  const titleId = useId();
  const firstFieldRef = useRef<HTMLSelectElement>(null);
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [templateId, setTemplateId] = useState(templates[0]?.id ?? "");
  const [parameters, setParameters] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<Toast | null>(null);
  const [requestKey, setRequestKey] = useState(() => crypto.randomUUID());

  const template = templates.find((item) => item.id === templateId) ?? null;
  const preview = useMemo(
    () => (template ? renderSmsTemplate(template.body, parameters) : ""),
    [parameters, template],
  );
  const parametersComplete =
    template !== null &&
    template.variables.every((name) => {
      const value = parameters[name]?.trim() ?? "";
      return value.length > 0 && value.length <= 25;
    });

  useEffect(() => {
    if (open) firstFieldRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 4000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  function selectTemplate(nextTemplateId: string) {
    setTemplateId(nextTemplateId);
    setParameters({});
  }

  function close() {
    if (pending) return;
    setOpen(false);
  }

  function send() {
    if (!template || !mobileValid || !parametersComplete || pending) return;
    startTransition(async () => {
      let result;
      try {
        result = await sendLeadSmsAction({
          leadId,
          templateId: template.id,
          parameters,
          idempotencyKey: requestKey,
        });
      } catch {
        setToast({
          tone: "error",
          message: "ارتباط با سرور برقرار نشد. دوباره تلاش کنید.",
        });
        return;
      }
      if (!result.ok) {
        setToast({ tone: "error", message: result.error });
        return;
      }
      setToast({ tone: "success", message: result.message });
      setOpen(false);
      setParameters({});
      setRequestKey(crypto.randomUUID());
      router.refresh();
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          compact
            ? "mt-2 w-full rounded border border-primary/30 px-2 py-1 text-xs font-medium text-primary"
            : "w-full rounded-lg border border-primary/30 px-3 py-2 text-sm font-medium text-primary"
        }
      >
        ارسال پیامک
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/55 p-4"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) close();
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            dir="rtl"
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-border bg-white p-5 shadow-2xl sm:p-6"
            onKeyDown={(event) => {
              if (event.key === "Escape") close();
            }}
          >
            <h2 id={titleId} className="text-lg font-bold text-primary">
              ارسال پیامک
            </h2>
            <dl className="mt-3 grid gap-1 rounded-xl bg-slate-50 px-3 py-3 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-muted">مخاطب</dt>
                <dd className="font-medium">{leadName}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted">موبایل</dt>
                <dd dir="ltr" className="font-medium">{mobile || "—"}</dd>
              </div>
            </dl>

            {!mobileValid ? (
              <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
                شماره موبایل مخاطب معتبر نیست و امکان ارسال وجود ندارد.
              </p>
            ) : null}

            <label className="mt-4 block text-sm">
              <span className="mb-1 block text-muted">قالب پیامک</span>
              <select
                ref={firstFieldRef}
                value={templateId}
                disabled={pending || templates.length === 0}
                onChange={(event) => selectTemplate(event.target.value)}
                className="w-full rounded-lg border border-border bg-white px-3 py-2"
              >
                {templates.length === 0 ? <option value="">بدون قالب</option> : null}
                {templates.map((item) => (
                  <option key={item.id} value={item.id}>{item.name}</option>
                ))}
              </select>
            </label>

            {templates.length === 0 ? (
              <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
                هیچ قالب پیامکی برای CRM تعریف نشده است.
              </p>
            ) : null}

            {template?.variables.map((name) => (
              <label key={name} className="mt-3 block text-sm">
                <span className="mb-1 block text-muted">{name}</span>
                <input
                  value={parameters[name] ?? ""}
                  maxLength={25}
                  disabled={pending}
                  onChange={(event) =>
                    setParameters((current) => ({
                      ...current,
                      [name]: event.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-border px-3 py-2"
                />
              </label>
            ))}

            <div className="mt-4">
              <p className="mb-1 text-sm text-muted">پیش‌نمایش پیام</p>
              <div className="min-h-20 whitespace-pre-wrap rounded-xl border border-border bg-slate-50 px-3 py-3 text-sm leading-7">
                {preview || "—"}
              </div>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={pending}
                onClick={close}
                className="rounded-xl border border-border px-4 py-2.5 text-sm disabled:opacity-50"
              >
                انصراف
              </button>
              <button
                type="button"
                disabled={
                  pending ||
                  !mobileValid ||
                  !template ||
                  !parametersComplete ||
                  !preview.trim()
                }
                onClick={send}
                className="rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
              >
                {pending ? "در حال ارسال…" : "ارسال پیامک"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {toast ? <SmsToast toast={toast} /> : null}
    </>
  );
}

export function FailedLeadSmsResendAction({
  leadId,
  messageId,
}: {
  leadId: string;
  messageId: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [toast, setToast] = useState<Toast | null>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 4000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  return (
    <>
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            let result;
            try {
              result = await resendFailedLeadSmsAction({
                leadId,
                messageId,
                idempotencyKey: crypto.randomUUID(),
              });
            } catch {
              setToast({
                tone: "error",
                message: "ارتباط با سرور برقرار نشد. دوباره تلاش کنید.",
              });
              return;
            }
            setToast({
              tone: result.ok ? "success" : "error",
              message: result.ok ? result.message : result.error,
            });
            if (result.ok) router.refresh();
          })
        }
        className="mt-2 rounded-lg border border-red-200 px-2.5 py-1 text-xs text-red-700 disabled:opacity-50"
      >
        {pending ? "در حال ارسال…" : "ارسال مجدد"}
      </button>
      {toast ? <SmsToast toast={toast} /> : null}
    </>
  );
}
