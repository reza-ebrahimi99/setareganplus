"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useState, useTransition } from "react";
import {
  createSmsTemplateAction,
  deleteSmsTemplateAction,
  updateSmsTemplateAction,
} from "./actions";
import type { AdminCommunicationData } from "@/lib/communication/load-admin-communication";
import {
  SMS_TEMPLATE_EDITOR_TYPES,
  SMS_TEMPLATE_TYPE_LABELS,
  type SmsTemplateEditorType,
} from "@/lib/communication/template-management";

type Template = AdminCommunicationData["templates"][number];

type Draft = {
  id: string | null;
  name: string;
  type: SmsTemplateEditorType;
  patternId: string;
  parameterNames: string;
  isActive: boolean;
  description: string;
};

const EMPTY_DRAFT: Draft = {
  id: null,
  name: "",
  type: "CUSTOM",
  patternId: "",
  parameterNames: "",
  isActive: true,
  description: "",
};

export function SmsTemplateManager({ templates }: { templates: Template[] }) {
  const router = useRouter();
  const titleId = useId();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{
    tone: "success" | "error";
    message: string;
  } | null>(null);

  useEffect(() => {
    if (!feedback || feedback.tone === "error") return;
    const timer = window.setTimeout(() => setFeedback(null), 4000);
    return () => window.clearTimeout(timer);
  }, [feedback]);

  function editTemplate(template: Template) {
    setFeedback(null);
    setDraft({
      id: template.id,
      name: template.name,
      type: template.type,
      patternId: template.code,
      parameterNames: template.parameters.join(", "),
      isActive: template.isActive,
      description: template.description,
    });
  }

  function save(formData: FormData) {
    if (!draft || pending) return;
    formData.set("isActive", draft.isActive ? "true" : "false");
    if (draft.id) formData.set("templateId", draft.id);
    startTransition(async () => {
      const result = draft.id
        ? await updateSmsTemplateAction(formData)
        : await createSmsTemplateAction(formData);
      if (!result.ok) {
        setFeedback({ tone: "error", message: result.error });
        return;
      }
      setFeedback({ tone: "success", message: result.message });
      setDraft(null);
      router.refresh();
    });
  }

  function remove(template: Template) {
    if (
      pending ||
      !window.confirm(`قالب «${template.name}» حذف شود؟ سوابق ارسال حفظ می‌شوند.`)
    ) {
      return;
    }
    startTransition(async () => {
      const result = await deleteSmsTemplateAction({ templateId: template.id });
      setFeedback({
        tone: result.ok ? "success" : "error",
        message: result.ok ? result.message : result.error,
      });
      if (result.ok) router.refresh();
    });
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="templates-heading" className="text-base font-bold text-primary">
            قالب‌های پیامک
          </h2>
          <p className="mt-1 text-xs leading-6 text-muted">
            شناسه الگو و نام پارامترها مطابق پنل SMS.ir وارد شوند.
          </p>
        </div>
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            setFeedback(null);
            setDraft({ ...EMPTY_DRAFT });
          }}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          افزودن قالب
        </button>
      </div>

      {feedback ? (
        <p
          role={feedback.tone === "error" ? "alert" : "status"}
          className={`rounded-lg px-3 py-2 text-sm ${
            feedback.tone === "error"
              ? "bg-red-50 text-red-800"
              : "bg-emerald-50 text-emerald-800"
          }`}
        >
          {feedback.message}
        </p>
      ) : null}

      {templates.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border px-4 py-8 text-center">
          <p className="font-medium text-primary">قالبی تعریف نشده است.</p>
          <p className="mt-1 text-sm text-muted">
            برای شروع، یک قالب جدید اضافه کنید.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[48rem] text-sm">
            <thead>
              <tr className="border-b border-border text-right text-xs text-muted">
                <th className="px-2 py-2 font-medium">عنوان</th>
                <th className="px-2 py-2 font-medium">نوع</th>
                <th className="px-2 py-2 font-medium">شناسه الگو</th>
                <th className="px-2 py-2 font-medium">پارامترها</th>
                <th className="px-2 py-2 font-medium">وضعیت</th>
                <th className="px-2 py-2 font-medium">عملیات</th>
              </tr>
            </thead>
            <tbody>
              {templates.map((template) => (
                <tr key={template.id} className="border-b border-border/60 align-top">
                  <td className="px-2 py-3">
                    <p className="font-medium text-primary">{template.name}</p>
                    {template.description ? (
                      <p className="mt-1 max-w-xs whitespace-pre-wrap text-xs text-muted">
                        {template.description}
                      </p>
                    ) : null}
                  </td>
                  <td className="px-2 py-3">{SMS_TEMPLATE_TYPE_LABELS[template.type]}</td>
                  <td className="px-2 py-3" dir="ltr">{template.code}</td>
                  <td className="px-2 py-3" dir="ltr">
                    {template.parameters.length > 0
                      ? template.parameters.join(", ")
                      : "—"}
                  </td>
                  <td className="px-2 py-3">
                    <span
                      className={`rounded-full px-2 py-1 text-xs ${
                        template.isActive
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {template.isActive ? "فعال" : "غیرفعال"}
                    </span>
                  </td>
                  <td className="px-2 py-3">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => editTemplate(template)}
                        className="rounded border border-border px-2.5 py-1 text-xs disabled:opacity-50"
                      >
                        ویرایش
                      </button>
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => remove(template)}
                        className="rounded border border-red-200 px-2.5 py-1 text-xs text-red-700 disabled:opacity-50"
                      >
                        حذف
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {draft ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !pending) setDraft(null);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            dir="rtl"
            className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-border bg-white p-5 shadow-2xl sm:p-6"
            onKeyDown={(event) => {
              if (event.key === "Escape" && !pending) setDraft(null);
            }}
          >
            <h3 id={titleId} className="text-lg font-bold text-primary">
              {draft.id ? "ویرایش قالب پیامک" : "افزودن قالب پیامک"}
            </h3>
            <form action={save} className="mt-5 space-y-4">
              <label className="block text-sm">
                <span className="mb-1 block text-muted">عنوان</span>
                <input
                  name="name"
                  required
                  maxLength={120}
                  defaultValue={draft.name}
                  className="w-full rounded-lg border border-border px-3 py-2"
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-muted">نوع</span>
                <select
                  name="type"
                  defaultValue={draft.type}
                  className="w-full rounded-lg border border-border bg-white px-3 py-2"
                >
                  {SMS_TEMPLATE_EDITOR_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {SMS_TEMPLATE_TYPE_LABELS[type]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-muted">شناسه الگوی SMS.ir</span>
                <input
                  name="patternId"
                  required
                  inputMode="numeric"
                  dir="ltr"
                  pattern="[1-9][0-9]*"
                  defaultValue={draft.patternId}
                  className="w-full rounded-lg border border-border px-3 py-2"
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-muted">نام پارامترها</span>
                <textarea
                  name="parameterNames"
                  rows={3}
                  dir="ltr"
                  defaultValue={draft.parameterNames}
                  placeholder="NAME, DATE, TIME"
                  className="w-full rounded-lg border border-border px-3 py-2"
                />
                <span className="mt-1 block text-xs text-muted">
                  نام‌ها را با ویرگول یا خط جدید جدا کنید؛ حداکثر ۱۰ پارامتر.
                </span>
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-muted">توضیحات</span>
                <textarea
                  name="description"
                  rows={4}
                  maxLength={2000}
                  defaultValue={draft.description}
                  className="w-full rounded-lg border border-border px-3 py-2"
                />
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={draft.isActive}
                  onChange={(event) =>
                    setDraft((current) =>
                      current
                        ? { ...current, isActive: event.target.checked }
                        : current,
                    )
                  }
                />
                فعال
              </label>
              <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => setDraft(null)}
                  className="rounded-xl border border-border px-4 py-2.5 text-sm disabled:opacity-50"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={pending}
                  className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {pending ? "در حال ذخیره…" : "ذخیره قالب"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
