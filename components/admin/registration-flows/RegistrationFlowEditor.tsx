"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useActionState,
  useEffect,
  useState,
  useTransition,
} from "react";
import {
  archiveRegistrationFlowAction,
  deleteDocumentRequirementAction,
  formatDateTimeLocalInTehran,
  publishRegistrationFlowAction,
  reorderDocumentRequirementsAction,
  softDeleteRegistrationFlowAction,
  unpublishRegistrationFlowAction,
  updateRegistrationFlowAction,
  updateRegistrationFlowStepsAction,
  upsertDocumentRequirementAction,
  type RegistrationFlowActionState,
} from "@/app/admin/(dashboard)/registrations/flows/actions";
import { MediaPickerField } from "@/components/admin/media/MediaPickerField";
import { JalaliDateTimeFields } from "@/components/datetime/JalaliDateTimeFields";
import {
  RegistrationDocumentType,
  RegistrationFlowPaymentMode,
  RegistrationProductType,
} from "@/generated/prisma/enums";
import { getFormFieldTypeLabel } from "@/lib/forms/form-field-type-labels";
import type { RegistrationFlowDetail } from "@/lib/registration/flows/admin";
import {
  DEFAULT_ACCEPTED_MIME,
  DOCUMENT_TYPE_LABELS,
  FLOW_LIFECYCLE_LABELS,
  FLOW_PAYMENT_MODE_LABELS,
  FLOW_STEP_LABELS,
  PRIMARY_FLOW_PAYMENT_MODES,
  PRODUCT_TYPE_LABELS,
} from "@/lib/registration/flows/constants";
import {
  getPublicRegistrationFlowPath,
  getPublicRegistrationFlowUrl,
} from "@/lib/registration/flows/public-url";
import { formatRials } from "@/lib/registration/format";
import type { SelectablePublishedForm } from "@/lib/site/load-site-placement";
import { toPersianDigits } from "@/lib/persian";

const emptyState: RegistrationFlowActionState = {};

type RegistrationFlowEditorProps = {
  flow: RegistrationFlowDetail;
  formOptions: SelectablePublishedForm[];
  qrDataUrl: string;
  canManage: boolean;
};

const inputClass =
  "w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm disabled:opacity-60";

function ActionFeedback({ state }: { state: RegistrationFlowActionState }) {
  if (state.formError) {
    return (
      <div
        role="alert"
        className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-7 text-red-800"
      >
        {state.formError}
      </div>
    );
  }
  if (state.successMessage) {
    return (
      <div
        role="status"
        className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-7 text-emerald-900"
      >
        {state.successMessage}
      </div>
    );
  }
  return null;
}

function CopyLinkButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(url);
          setCopied(true);
          window.setTimeout(() => setCopied(false), 2000);
        } catch {
          /* ignore */
        }
      }}
      className="min-h-11 rounded-xl border border-border bg-white px-4 py-2.5 text-sm font-medium"
    >
      {copied ? "کپی شد" : "کپی لینک"}
    </button>
  );
}

export function RegistrationFlowEditor({
  flow,
  formOptions,
  qrDataUrl,
  canManage,
}: RegistrationFlowEditorProps) {
  const router = useRouter();
  const [updateState, updateAction, updatePending] = useActionState(
    updateRegistrationFlowAction,
    emptyState,
  );
  const [stepsState, stepsAction, stepsPending] = useActionState(
    updateRegistrationFlowStepsAction,
    emptyState,
  );
  const [docState, docAction, docPending] = useActionState(
    upsertDocumentRequirementAction,
    emptyState,
  );
  const [reorderState, reorderAction, reorderPending] = useActionState(
    reorderDocumentRequirementsAction,
    emptyState,
  );
  const [publishState, publishFormAction, publishPending] = useActionState(
    publishRegistrationFlowAction,
    emptyState,
  );
  const [unpublishState, unpublishFormAction, unpublishPending] = useActionState(
    unpublishRegistrationFlowAction,
    emptyState,
  );
  const [archiveState, archiveFormAction, archivePending] = useActionState(
    archiveRegistrationFlowAction,
    emptyState,
  );
  const [, startTransition] = useTransition();

  const [steps, setSteps] = useState(flow.steps);
  const [documents, setDocuments] = useState(flow.documentRequirements);
  const [editingDocId, setEditingDocId] = useState<string | null>(null);
  const [showNewDoc, setShowNewDoc] = useState(false);
  const [timedDiscountEnabled, setTimedDiscountEnabled] = useState(
    flow.saleAmountRials != null,
  );
  const [paymentMode, setPaymentMode] = useState(flow.paymentMode);
  const isFreePayment = paymentMode === RegistrationFlowPaymentMode.FREE;

  useEffect(() => {
    if (
      updateState.successMessage ||
      stepsState.successMessage ||
      docState.successMessage ||
      reorderState.successMessage ||
      publishState.successMessage ||
      unpublishState.successMessage ||
      archiveState.successMessage
    ) {
      router.refresh();
    }
  }, [
    archiveState.successMessage,
    docState.successMessage,
    publishState.successMessage,
    reorderState.successMessage,
    router,
    stepsState.successMessage,
    unpublishState.successMessage,
    updateState.successMessage,
  ]);

  const publicPath = getPublicRegistrationFlowPath(flow.slug);
  const publicUrl = getPublicRegistrationFlowUrl(flow.slug);
  const previewHref = `${publicPath}?preview=1`;
  const wizardHref = `${publicPath}/wizard`;

  function moveStep(index: number, direction: -1 | 1) {
    setSteps((current) => {
      const target = index + direction;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next.map((step, sortOrder) => ({ ...step, sortOrder }));
    });
  }

  function moveDocument(index: number, direction: -1 | 1) {
    setDocuments((current) => {
      const target = index + direction;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function saveDocumentOrder() {
    const formData = new FormData();
    formData.set("flowId", flow.id);
    for (const doc of documents) {
      formData.append("orderedId", doc.id);
    }
    startTransition(() => {
      reorderAction(formData);
    });
  }

  const editingDoc = editingDocId
    ? documents.find((doc) => doc.id === editingDocId)
    : null;

  return (
    <div className="space-y-6">
      <ActionFeedback
        state={
          updateState.formError || updateState.successMessage
            ? updateState
            : stepsState.formError || stepsState.successMessage
              ? stepsState
              : docState.formError || docState.successMessage
                ? docState
                : reorderState.formError || reorderState.successMessage
                  ? reorderState
                  : publishState.formError || publishState.successMessage
                    ? publishState
                    : unpublishState.formError || unpublishState.successMessage
                      ? unpublishState
                      : archiveState
        }
      />

      <form action={updateAction} className="admin-card space-y-6 p-5">
        <input type="hidden" name="flowId" value={flow.id} />

        <section className="space-y-4">
          <h2 className="text-sm font-bold text-primary">عمومی</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm sm:col-span-2">
              <span className="mb-1.5 block text-muted">عنوان *</span>
              <input
                name="title"
                required
                minLength={2}
                defaultValue={flow.title}
                disabled={!canManage}
                className={inputClass}
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1.5 block text-muted">نامک (slug)</span>
              <input
                name="slug"
                dir="ltr"
                defaultValue={flow.slug}
                disabled={!canManage}
                className={`${inputClass} font-mono`}
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1.5 block text-muted">نوع محصول</span>
              <select
                name="productType"
                defaultValue={flow.productType}
                disabled={!canManage}
                className={inputClass}
              >
                {Object.values(RegistrationProductType).map((type) => (
                  <option key={type} value={type}>
                    {PRODUCT_TYPE_LABELS[type]}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm sm:col-span-2">
              <span className="mb-1.5 block text-muted">توضیحات</span>
              <textarea
                name="description"
                rows={3}
                defaultValue={flow.description}
                disabled={!canManage}
                className={inputClass}
              />
            </label>
            <div className="sm:col-span-2">
              <MediaPickerField
                name="coverMediaId"
                label="تصویر جلد"
                value={flow.coverMediaId}
                previewUrl={flow.coverUrl}
                previewTitle={flow.title}
                disabled={!canManage}
              />
            </div>
            <div className="rounded-xl bg-background px-3 py-2 text-sm sm:col-span-2">
              <span className="text-muted">وضعیت انتشار: </span>
              <strong>{FLOW_LIFECYCLE_LABELS[flow.lifecycle]}</strong>
              {flow.publishedAt ? (
                <span className="ms-2 text-xs text-muted">
                  (اولین انتشار:{" "}
                  {toPersianDigits(
                    new Date(flow.publishedAt).toLocaleDateString("fa-IR"),
                  )}
                  )
                </span>
              ) : null}
            </div>
            <label className="block text-sm">
              <span className="mb-1.5 block text-muted">شروع ثبت‌نام</span>
              <input
                name="opensAt"
                type="datetime-local"
                defaultValue={
                  flow.opensAt ? formatDateTimeLocalInTehran(flow.opensAt) : ""
                }
                disabled={!canManage}
                className={inputClass}
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1.5 block text-muted">پایان ثبت‌نام</span>
              <input
                name="closesAt"
                type="datetime-local"
                defaultValue={
                  flow.closesAt ? formatDateTimeLocalInTehran(flow.closesAt) : ""
                }
                disabled={!canManage}
                className={inputClass}
              />
            </label>
          </div>
        </section>

        <section className="space-y-4 border-t border-border/60 pt-5">
          <h2 className="text-sm font-bold text-primary">اتصال فرم</h2>
          <p className="text-xs leading-6 text-muted">
            فرم را از فرم‌ساز بسازید و منتشر کنید — اینجا فقط اتصال انجام می‌شود.
          </p>
          <label className="block text-sm">
            <span className="mb-1.5 block text-muted">فرم منتشرشده</span>
            <select
              name="formId"
              defaultValue={flow.formId ?? ""}
              disabled={!canManage}
              className={inputClass}
            >
              <option value="">بدون فرم</option>
              {formOptions.map((form) => (
                <option key={form.id} value={form.id}>
                  {form.title} ({form.slug})
                </option>
              ))}
            </select>
          </label>
          {flow.formId ? (
            <Link
              href={`/admin/forms/${flow.formId}`}
              className="inline-flex text-sm font-semibold text-secondary hover:underline"
            >
              باز کردن در فرم‌ساز
            </Link>
          ) : null}
          {flow.formPreview.length > 0 ? (
            <ul className="space-y-2 rounded-xl border border-border bg-background p-3">
              {flow.formPreview.map((question) => (
                <li
                  key={question.fieldKey}
                  className="flex flex-wrap items-center justify-between gap-2 border-b border-border/50 py-2 text-sm last:border-0"
                >
                  <span className="font-medium">{question.label}</span>
                  <span className="text-xs text-muted">
                    {getFormFieldTypeLabel(
                      question.type as import("@/generated/prisma/enums").FormFieldType,
                    )}
                    {question.required ? " · الزامی" : ""}
                  </span>
                </li>
              ))}
            </ul>
          ) : flow.formId ? (
            <p className="text-sm text-muted">پیش‌نمایش پرسش‌ها در دسترس نیست.</p>
          ) : null}
        </section>

        <section className="space-y-4 border-t border-border/60 pt-5">
          <h2 className="text-sm font-bold text-primary">پرداخت</h2>
          <p className="text-xs leading-6 text-muted">
            تسویه از طریق زیرساخت پرداخت موجود (Payment Foundation) انجام می‌شود.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="mb-1.5 block text-muted">حالت پرداخت</span>
              <select
                name="paymentMode"
                value={paymentMode}
                onChange={(event) => {
                  const next = event.target
                    .value as typeof flow.paymentMode;
                  setPaymentMode(next);
                  if (next === RegistrationFlowPaymentMode.FREE) {
                    setTimedDiscountEnabled(false);
                  }
                }}
                disabled={!canManage}
                className={inputClass}
              >
                {[
                  ...PRIMARY_FLOW_PAYMENT_MODES,
                  ...(PRIMARY_FLOW_PAYMENT_MODES.includes(flow.paymentMode)
                    ? []
                    : [flow.paymentMode]),
                ].map((mode) => (
                  <option key={mode} value={mode}>
                    {FLOW_PAYMENT_MODE_LABELS[mode]}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="mb-1.5 block text-muted">قیمت اصلی (ریال)</span>
              <input
                name="paymentAmountRials"
                type="number"
                min={0}
                step={1000}
                defaultValue={flow.paymentAmountRials}
                disabled={!canManage || isFreePayment}
                className={inputClass}
              />
            </label>
            <label className="block text-sm sm:col-span-2">
              <span className="mb-1.5 block text-muted">عنوان پرداخت</span>
              <input
                name="paymentTitle"
                defaultValue={flow.paymentTitle ?? ""}
                disabled={!canManage || isFreePayment}
                className={inputClass}
              />
            </label>
            <label className="block text-sm sm:col-span-2">
              <span className="mb-1.5 block text-muted">مهلت پرداخت</span>
              <input
                name="paymentDeadlineAt"
                type="datetime-local"
                defaultValue={
                  flow.paymentDeadlineAt
                    ? formatDateTimeLocalInTehran(flow.paymentDeadlineAt)
                    : ""
                }
                disabled={!canManage || isFreePayment}
                className={inputClass}
              />
            </label>
          </div>

          <div className="space-y-4 rounded-2xl border border-border/80 bg-background/60 p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-sm font-semibold text-primary">
                  تخفیف زمان‌دار
                </h3>
                <p className="mt-1 text-xs leading-6 text-muted">
                  در بازه مشخص، مبلغ پرداخت به قیمت تخفیفی تغییر می‌کند.
                </p>
              </div>
              <label className="inline-flex min-h-11 items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="timedDiscountEnabled"
                  checked={timedDiscountEnabled && !isFreePayment}
                  onChange={(event) =>
                    setTimedDiscountEnabled(event.target.checked)
                  }
                  disabled={!canManage || isFreePayment}
                  className="size-4 rounded border-border"
                />
                فعال‌سازی تخفیف زمان‌دار
              </label>
            </div>

            {isFreePayment ? (
              <p className="text-xs leading-6 text-muted">
                برای جریان رایگان، تخفیف زمان‌دار اعمال نمی‌شود.
              </p>
            ) : null}

            {timedDiscountEnabled && !isFreePayment ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm">
                  <span className="mb-1.5 block text-muted">
                    قیمت تخفیفی (ریال)
                  </span>
                  <input
                    name="saleAmountRials"
                    type="number"
                    min={0}
                    step={1000}
                    defaultValue={
                      flow.saleAmountRials != null
                        ? String(flow.saleAmountRials)
                        : ""
                    }
                    disabled={!canManage}
                    className={inputClass}
                  />
                  {updateState.fieldErrors?.saleAmountRials ? (
                    <p className="mt-1 text-xs text-red-600">
                      {updateState.fieldErrors.saleAmountRials}
                    </p>
                  ) : null}
                </label>
                <label className="block text-sm">
                  <span className="mb-1.5 block text-muted">عنوان تخفیف</span>
                  <input
                    name="pricingBadge"
                    defaultValue={flow.pricingBadge ?? ""}
                    placeholder="مثلاً فقط تا پایان تیر"
                    disabled={!canManage}
                    className={inputClass}
                  />
                </label>
                <div className="block text-sm">
                  <span className="mb-1.5 block text-muted">شروع تخفیف</span>
                  <JalaliDateTimeFields
                    id="discountStartsAt"
                    name="discountStartsAt"
                    defaultDate={flow.discountStartsAt}
                    disabled={!canManage}
                    hasError={Boolean(updateState.fieldErrors?.discountStartsAt)}
                  />
                  {updateState.fieldErrors?.discountStartsAt ? (
                    <p className="mt-1 text-xs text-red-600">
                      {updateState.fieldErrors.discountStartsAt}
                    </p>
                  ) : null}
                </div>
                <div className="block text-sm">
                  <span className="mb-1.5 block text-muted">پایان تخفیف</span>
                  <JalaliDateTimeFields
                    id="discountEndsAt"
                    name="discountEndsAt"
                    defaultDate={flow.discountEndsAt}
                    disabled={!canManage}
                    hasError={Boolean(updateState.fieldErrors?.discountEndsAt)}
                  />
                  {updateState.fieldErrors?.discountEndsAt ? (
                    <p className="mt-1 text-xs text-red-600">
                      {updateState.fieldErrors.discountEndsAt}
                    </p>
                  ) : null}
                </div>
                <label className="inline-flex min-h-11 items-center gap-2 text-sm sm:col-span-2">
                  <input
                    type="checkbox"
                    name="showDiscountCountdown"
                    defaultChecked={flow.showDiscountCountdown}
                    disabled={!canManage}
                    className="size-4 rounded border-border"
                  />
                  نمایش شمارش معکوس تا پایان تخفیف
                </label>
              </div>
            ) : null}
          </div>
        </section>

        <section className="space-y-4 border-t border-border/60 pt-5">
          <h2 className="text-sm font-bold text-primary">هدف‌گیری</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm sm:col-span-2">
              <span className="mb-1.5 block text-muted">پایه‌های هدف</span>
              <input
                name="gradeTargets"
                defaultValue={flow.gradeTargets ?? ""}
                placeholder="مثلاً هفتم، هشتم"
                disabled={!canManage}
                className={inputClass}
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1.5 block text-muted">دوره / کلاس</span>
              <input
                name="courseTarget"
                defaultValue={flow.courseTarget ?? ""}
                disabled={!canManage}
                className={inputClass}
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1.5 block text-muted">سال تحصیلی</span>
              <input
                name="academicYear"
                defaultValue={flow.academicYear ?? ""}
                disabled={!canManage}
                className={inputClass}
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1.5 block text-muted">ظرفیت</span>
              <input
                name="capacity"
                type="number"
                min={0}
                defaultValue={flow.capacity ?? ""}
                disabled={!canManage}
                className={inputClass}
              />
            </label>
          </div>
        </section>

        {canManage ? (
          <button
            type="submit"
            disabled={updatePending}
            className="min-h-11 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-white disabled:opacity-60"
          >
            {updatePending ? "در حال ذخیره…" : "ذخیره تنظیمات"}
          </button>
        ) : null}
      </form>

      <section className="admin-card space-y-4 p-5">
        <h2 className="text-sm font-bold text-primary">مراحل ویزارد</h2>
        <form action={stepsAction} className="space-y-3">
          <input type="hidden" name="flowId" value={flow.id} />
          {steps.map((step, index) => (
            <div
              key={step.id}
              className="flex flex-col gap-3 rounded-xl border border-border bg-white p-3 sm:flex-row sm:items-center"
            >
              <input type="hidden" name="stepId" value={step.id} />
              <input
                type="hidden"
                name={`enabled_${step.id}`}
                value={step.enabled ? "true" : "false"}
              />
              <div className="min-w-0 flex-1 space-y-2">
                <p className="text-xs text-muted">
                  {FLOW_STEP_LABELS[step.stepKey]} ({step.stepKey})
                </p>
                <input
                  name={`label_${step.id}`}
                  defaultValue={step.label}
                  disabled={!canManage}
                  onChange={(event) => {
                    const label = event.target.value;
                    setSteps((current) =>
                      current.map((item) =>
                        item.id === step.id ? { ...item, label } : item,
                      ),
                    );
                  }}
                  className={inputClass}
                />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={step.enabled}
                  disabled={!canManage}
                  onChange={(event) => {
                    const enabled = event.target.checked;
                    setSteps((current) =>
                      current.map((item) =>
                        item.id === step.id ? { ...item, enabled } : item,
                      ),
                    );
                  }}
                />
                فعال
              </label>
              {canManage ? (
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={index === 0}
                    onClick={() => moveStep(index, -1)}
                    className="rounded-lg border border-border px-2 py-1 text-xs disabled:opacity-40"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    disabled={index === steps.length - 1}
                    onClick={() => moveStep(index, 1)}
                    className="rounded-lg border border-border px-2 py-1 text-xs disabled:opacity-40"
                  >
                    ↓
                  </button>
                </div>
              ) : null}
            </div>
          ))}
          {canManage ? (
            <button
              type="submit"
              disabled={stepsPending}
              className="min-h-11 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-white disabled:opacity-60"
            >
              {stepsPending ? "در حال ذخیره…" : "ذخیره مراحل"}
            </button>
          ) : null}
        </form>
      </section>

      <section className="admin-card space-y-4 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-bold text-primary">مدارک موردنیاز</h2>
          {canManage ? (
            <button
              type="button"
              onClick={() => {
                setEditingDocId(null);
                setShowNewDoc(true);
              }}
              className="rounded-xl border border-border bg-white px-3 py-2 text-xs font-semibold"
            >
              افزودن مدرک
            </button>
          ) : null}
        </div>

        {documents.length === 0 ? (
          <p className="text-sm text-muted">مدرکی تعریف نشده است.</p>
        ) : (
          <ul className="space-y-2">
            {documents.map((doc, index) => (
              <li
                key={doc.id}
                className="flex flex-col gap-2 rounded-xl border border-border bg-white p-3 sm:flex-row sm:items-center"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{doc.title}</p>
                  <p className="text-xs text-muted">
                    {DOCUMENT_TYPE_LABELS[doc.documentType]}
                    {doc.required ? " · الزامی" : ""}
                  </p>
                </div>
                {canManage ? (
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowNewDoc(false);
                        setEditingDocId(doc.id);
                      }}
                      className="text-xs font-semibold text-secondary"
                    >
                      ویرایش
                    </button>
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => moveDocument(index, -1)}
                      className="rounded-lg border border-border px-2 py-1 text-xs disabled:opacity-40"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      disabled={index === documents.length - 1}
                      onClick={() => moveDocument(index, 1)}
                      className="rounded-lg border border-border px-2 py-1 text-xs disabled:opacity-40"
                    >
                      ↓
                    </button>
                    <form action={deleteDocumentRequirementAction}>
                      <input type="hidden" name="flowId" value={flow.id} />
                      <input
                        type="hidden"
                        name="requirementId"
                        value={doc.id}
                      />
                      <button
                        type="submit"
                        className="text-xs font-semibold text-danger"
                      >
                        حذف
                      </button>
                    </form>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}

        {canManage && documents.length > 1 ? (
          <button
            type="button"
            disabled={reorderPending}
            onClick={saveDocumentOrder}
            className="rounded-xl border border-border bg-white px-4 py-2 text-xs font-semibold disabled:opacity-60"
          >
            {reorderPending ? "در حال ذخیره…" : "ذخیره ترتیب مدارک"}
          </button>
        ) : null}

        {canManage && (showNewDoc || editingDoc) ? (
          <form action={docAction} className="space-y-3 rounded-xl border border-dashed border-border p-4">
            <input type="hidden" name="flowId" value={flow.id} />
            {editingDoc ? (
              <input type="hidden" name="requirementId" value={editingDoc.id} />
            ) : null}
            <label className="block text-sm">
              <span className="mb-1.5 block text-muted">عنوان *</span>
              <input
                name="title"
                required
                minLength={2}
                defaultValue={editingDoc?.title ?? ""}
                className={inputClass}
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1.5 block text-muted">راهنما</span>
              <textarea
                name="helpText"
                rows={2}
                defaultValue={editingDoc?.helpText ?? ""}
                className={inputClass}
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1.5 block text-muted">نوع مدرک</span>
              <select
                name="documentType"
                defaultValue={
                  editingDoc?.documentType ?? RegistrationDocumentType.OTHER
                }
                className={inputClass}
              >
                {Object.values(RegistrationDocumentType).map((type) => (
                  <option key={type} value={type}>
                    {DOCUMENT_TYPE_LABELS[type]}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="required"
                value="true"
                defaultChecked={editingDoc?.required ?? true}
              />
              الزامی
            </label>
            <label className="block text-sm">
              <span className="mb-1.5 block text-muted">MIME پذیرفته‌شده</span>
              <input
                name="acceptedMimeTypes"
                defaultValue={editingDoc?.acceptedMimeTypes ?? DEFAULT_ACCEPTED_MIME}
                dir="ltr"
                className={`${inputClass} font-mono text-xs`}
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1.5 block text-muted">حداکثر حجم (مگابایت)</span>
              <input
                name="maxSizeMb"
                type="number"
                min={0.05}
                max={20}
                step={0.1}
                defaultValue={
                  editingDoc
                    ? (editingDoc.maxSizeBytes / (1024 * 1024)).toFixed(1)
                    : "5"
                }
                className={inputClass}
              />
            </label>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={docPending}
                className="min-h-11 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
              >
                {docPending ? "در حال ذخیره…" : "ذخیره مدرک"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowNewDoc(false);
                  setEditingDocId(null);
                }}
                className="min-h-11 rounded-xl border border-border px-4 py-2 text-sm"
              >
                انصراف
              </button>
            </div>
          </form>
        ) : null}
      </section>

      <section className="admin-card space-y-4 p-5">
        <h2 className="text-sm font-bold text-primary">انتشار</h2>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <div className="relative size-[220px] shrink-0 overflow-hidden rounded-xl border border-border bg-white p-2">
            <Image
              src={qrDataUrl}
              alt={`QR ${flow.slug}`}
              fill
              unoptimized
              className="object-contain p-2"
            />
          </div>
          <div className="min-w-0 flex-1 space-y-3">
            <p className="text-sm">
              <span className="text-muted">آدرس عمومی: </span>
              <a
                href={publicUrl}
                target="_blank"
                rel="noreferrer"
                className="break-all font-mono text-xs text-secondary hover:underline"
                dir="ltr"
              >
                {publicUrl}
              </a>
            </p>
            <p className="text-sm text-muted">
              مبلغ فعلی:{" "}
              {flow.paymentAmountRials > 0
                ? formatRials(flow.paymentAmountRials)
                : "رایگان"}
            </p>
            <div className="flex flex-wrap gap-2">
              <CopyLinkButton url={publicUrl} />
              <Link
                href={previewHref}
                target="_blank"
                className="inline-flex min-h-11 items-center rounded-xl border border-secondary/40 bg-secondary/10 px-4 py-2.5 text-sm font-medium text-primary"
              >
                پیش‌نمایش
              </Link>
              <Link
                href={wizardHref}
                target="_blank"
                className="inline-flex min-h-11 items-center rounded-xl border border-border bg-white px-4 py-2.5 text-sm font-medium"
              >
                ویزارد
              </Link>
            </div>
          </div>
        </div>

        {canManage ? (
          <div className="flex flex-wrap gap-2 border-t border-border/60 pt-4">
            <form action={publishFormAction}>
              <input type="hidden" name="flowId" value={flow.id} />
              <input type="hidden" name="slug" value={flow.slug} />
              <button
                type="submit"
                disabled={publishPending}
                className="rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-white disabled:opacity-60"
              >
                انتشار
              </button>
            </form>
            <form action={unpublishFormAction}>
              <input type="hidden" name="flowId" value={flow.id} />
              <input type="hidden" name="slug" value={flow.slug} />
              <button
                type="submit"
                disabled={unpublishPending}
                className="rounded-xl border border-border bg-white px-4 py-2 text-xs font-semibold disabled:opacity-60"
              >
                لغو انتشار
              </button>
            </form>
            <form action={archiveFormAction}>
              <input type="hidden" name="flowId" value={flow.id} />
              <input type="hidden" name="slug" value={flow.slug} />
              <button
                type="submit"
                disabled={archivePending}
                className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-xs font-semibold text-amber-950 disabled:opacity-60"
              >
                بایگانی
              </button>
            </form>
            <form action={softDeleteRegistrationFlowAction}>
              <input type="hidden" name="flowId" value={flow.id} />
              <input type="hidden" name="slug" value={flow.slug} />
              <button
                type="submit"
                className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-xs font-semibold text-red-800"
              >
                حذف نرم
              </button>
            </form>
          </div>
        ) : null}
      </section>
    </div>
  );
}
