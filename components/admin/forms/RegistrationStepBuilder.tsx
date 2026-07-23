"use client";

import { useActionState, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  assignFieldToStepAction,
  createStepAction,
  deleteStepAction,
  moveStepDownAction,
  moveStepFieldDownAction,
  moveStepFieldUpAction,
  moveStepUpAction,
  updateStepAction,
  type SimpleStepActionState,
  type StepActionState,
} from "@/app/admin/(dashboard)/forms/step-actions";
import { getFormFieldTypeLabel } from "@/lib/forms/form-field-type-labels";
import type { EditorField, EditorStep } from "@/lib/forms/load-form-editor";
import { toPersianDigits } from "@/lib/persian";

type RegistrationStepBuilderProps = {
  formId: string;
  editable: boolean;
  steps: EditorStep[];
  fields: EditorField[];
};

const emptyStepState: StepActionState = {};
const emptySimpleState: SimpleStepActionState = {};

function fieldInputClass(hasError: boolean): string {
  const base =
    "mt-1.5 w-full rounded-xl border bg-surface px-3 py-2.5 text-sm text-foreground outline-none transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary";
  return hasError
    ? `${base} border-red-400`
    : `${base} border-border hover:border-secondary/40`;
}

function ActionMessage({
  error,
  success,
}: {
  error?: string;
  success?: string;
}) {
  if (error) {
    return (
      <p role="alert" className="text-sm leading-7 text-red-700">
        {error}
      </p>
    );
  }
  if (success) {
    return (
      <p role="status" className="text-sm leading-7 text-emerald-800">
        {success}
      </p>
    );
  }
  return null;
}

function IconButton({
  label,
  pending,
  disabled,
  children,
}: {
  label: string;
  pending?: boolean;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="submit"
      aria-label={label}
      title={label}
      disabled={disabled || pending}
      className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-border bg-surface px-3 text-sm font-medium text-foreground transition-colors hover:bg-background disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
    >
      {pending ? "…" : children}
    </button>
  );
}

export function RegistrationStepBuilder({
  formId,
  editable,
  steps,
  fields,
}: RegistrationStepBuilderProps) {
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());
  const [editingStepId, setEditingStepId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const fieldsByStepId = useMemo(() => {
    const map = new Map<string, EditorField[]>();
    for (const step of steps) {
      map.set(step.id, []);
    }
    const unassigned: EditorField[] = [];
    for (const field of fields) {
      if (field.formStepId && map.has(field.formStepId)) {
        map.get(field.formStepId)?.push(field);
      } else {
        unassigned.push(field);
      }
    }
    return { map, unassigned };
  }, [fields, steps]);

  const assignedCount = fields.length - fieldsByStepId.unassigned.length;

  function toggleExpanded(stepId: string) {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(stepId)) {
        next.delete(stepId);
      } else {
        next.add(stepId);
      }
      return next;
    });
  }

  if (!editable) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-background px-4 py-8 text-center sm:px-6">
        <p className="text-sm font-medium text-primary">ویرایش مراحل غیرفعال است</p>
        <p className="mt-2 text-sm leading-7 text-muted">
          فقط نسخه پیش‌نویس قابل ویرایش است. پس از انتشار، پیش‌نویس تازه برای
          ویرایش مراحل ایجاد می‌شود.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="rounded-xl border border-border bg-surface px-4 py-4 sm:px-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0 space-y-1">
            <h3 className="text-base font-semibold text-primary">
              سازنده مراحل ثبت‌نام
            </h3>
            <p className="text-sm leading-7 text-muted">
              مراحل را بسازید، فیلدها را به هر مرحله اختصاص دهید و ترتیب را
              تنظیم کنید. این تغییرات فقط روی نسخه پیش‌نویس اعمال می‌شود.
            </p>
          </div>
          <dl className="grid grid-cols-3 gap-2 text-center text-xs sm:text-sm">
            <div className="rounded-xl bg-background px-3 py-2">
              <dt className="text-muted">مراحل</dt>
              <dd className="mt-1 font-semibold text-foreground">
                {toPersianDigits(steps.length)}
              </dd>
            </div>
            <div className="rounded-xl bg-background px-3 py-2">
              <dt className="text-muted">اختصاص‌یافته</dt>
              <dd className="mt-1 font-semibold text-foreground">
                {toPersianDigits(assignedCount)}
              </dd>
            </div>
            <div className="rounded-xl bg-background px-3 py-2">
              <dt className="text-muted">بدون مرحله</dt>
              <dd className="mt-1 font-semibold text-foreground">
                {toPersianDigits(fieldsByStepId.unassigned.length)}
              </dd>
            </div>
          </dl>
        </div>
      </header>

      <CreateStepForm formId={formId} />

      {steps.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-background px-4 py-10 text-center">
          <p className="text-sm font-medium text-primary">هنوز مرحله‌ای ندارید</p>
          <p className="mt-2 text-sm leading-7 text-muted">
            اولین مرحله را بسازید؛ سپس فیلدهای فرم را از بخش «فیلدهای بدون
            مرحله» به آن اختصاص دهید.
          </p>
        </div>
      ) : (
        <ul className="space-y-4">
          {steps.map((step, index) => {
            const stepFields = fieldsByStepId.map.get(step.id) ?? [];
            const expanded = !collapsedIds.has(step.id);
            return (
              <li key={step.id}>
                <StepCard
                  formId={formId}
                  step={step}
                  stepNumber={index + 1}
                  isFirst={index === 0}
                  isLast={index === steps.length - 1}
                  fields={stepFields}
                  allSteps={steps}
                  expanded={expanded}
                  editing={editingStepId === step.id}
                  pendingDelete={pendingDeleteId === step.id}
                  onToggleExpand={() => toggleExpanded(step.id)}
                  onStartEdit={() => {
                    setEditingStepId(step.id);
                    setPendingDeleteId(null);
                  }}
                  onCancelEdit={() => setEditingStepId(null)}
                  onRequestDelete={() => {
                    setPendingDeleteId(step.id);
                    setEditingStepId(null);
                  }}
                  onCancelDelete={() => setPendingDeleteId(null)}
                />
              </li>
            );
          })}
        </ul>
      )}

      <UnassignedFieldsSection
        formId={formId}
        fields={fieldsByStepId.unassigned}
        steps={steps}
      />
    </div>
  );
}

function CreateStepForm({ formId }: { formId: string }) {
  const [state, formAction, pending] = useActionState(
    createStepAction,
    emptyStepState,
  );

  useEffect(() => {
    if (!state.successMessage) {
      return;
    }
    const form = document.getElementById(
      "create-registration-step-form",
    ) as HTMLFormElement | null;
    form?.reset();
  }, [state.successMessage]);

  return (
    <form
      id="create-registration-step-form"
      action={formAction}
      className="space-y-4 rounded-xl border border-border bg-surface px-4 py-4 sm:px-5"
      noValidate
    >
      <input type="hidden" name="formId" value={formId} />
      <div>
        <h4 className="text-sm font-semibold text-primary">افزودن مرحله</h4>
        <p className="mt-1 text-xs leading-6 text-muted">
          کلید مرحله به‌صورت خودکار و پایدار ساخته می‌شود.
        </p>
      </div>
      <div>
        <label htmlFor="new-step-title" className="text-sm font-medium text-primary">
          عنوان مرحله
        </label>
        <input
          id="new-step-title"
          name="title"
          type="text"
          required
          maxLength={200}
          defaultValue={state.values?.title ?? ""}
          aria-invalid={state.fieldErrors?.title ? true : undefined}
          className={fieldInputClass(Boolean(state.fieldErrors?.title))}
          placeholder="مثال: اطلاعات دانش‌آموز"
        />
        {state.fieldErrors?.title ? (
          <p className="mt-1.5 text-sm text-red-700">{state.fieldErrors.title}</p>
        ) : null}
      </div>
      <div>
        <label
          htmlFor="new-step-description"
          className="text-sm font-medium text-primary"
        >
          توضیح (اختیاری)
        </label>
        <textarea
          id="new-step-description"
          name="description"
          rows={2}
          maxLength={2000}
          defaultValue={state.values?.description ?? ""}
          className={fieldInputClass(false)}
          placeholder="راهنمای کوتاه برای این مرحله"
        />
      </div>
      <ActionMessage error={state.formError} success={state.successMessage} />
      <button
        type="submit"
        disabled={pending}
        className="inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-5 text-sm font-medium text-white hover:bg-primary/92 disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
      >
        {pending ? "در حال افزودن…" : "افزودن مرحله"}
      </button>
    </form>
  );
}

function StepCard({
  formId,
  step,
  stepNumber,
  isFirst,
  isLast,
  fields,
  allSteps,
  expanded,
  editing,
  pendingDelete,
  onToggleExpand,
  onStartEdit,
  onCancelEdit,
  onRequestDelete,
  onCancelDelete,
}: {
  formId: string;
  step: EditorStep;
  stepNumber: number;
  isFirst: boolean;
  isLast: boolean;
  fields: EditorField[];
  allSteps: EditorStep[];
  expanded: boolean;
  editing: boolean;
  pendingDelete: boolean;
  onToggleExpand: () => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onRequestDelete: () => void;
  onCancelDelete: () => void;
}) {
  const [upState, upAction, upPending] = useActionState(
    moveStepUpAction,
    emptySimpleState,
  );
  const [downState, downAction, downPending] = useActionState(
    moveStepDownAction,
    emptySimpleState,
  );
  const [deleteState, deleteAction, deletePending] = useActionState(
    deleteStepAction,
    emptySimpleState,
  );
  const [updateState, updateAction, updatePending] = useActionState(
    updateStepAction,
    emptyStepState,
  );

  useEffect(() => {
    if (updateState.successMessage) {
      onCancelEdit();
    }
    // Intentionally only react to success payload, not callback identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- close edit panel once
  }, [updateState.successMessage]);

  useEffect(() => {
    if (deleteState.successMessage) {
      onCancelDelete();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- close delete panel once
  }, [deleteState.successMessage]);

  const statusMessage =
    upState.formError ||
    downState.formError ||
    deleteState.formError ||
    updateState.formError ||
    upState.successMessage ||
    downState.successMessage ||
    deleteState.successMessage ||
    updateState.successMessage;

  const statusIsError = Boolean(
    upState.formError ||
      downState.formError ||
      deleteState.formError ||
      updateState.formError,
  );

  return (
    <article className="rounded-xl border border-border bg-surface">
      <div className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-5">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex min-h-8 min-w-8 items-center justify-center rounded-lg bg-primary/10 px-2 text-sm font-semibold text-primary">
              {toPersianDigits(stepNumber)}
            </span>
            <h4 className="text-base font-semibold text-primary">{step.title}</h4>
            <span className="rounded-lg bg-background px-2 py-1 text-xs text-muted">
              {toPersianDigits(fields.length)} فیلد
            </span>
          </div>
          {step.description ? (
            <p className="text-sm leading-7 text-muted">{step.description}</p>
          ) : (
            <p className="text-sm text-muted">بدون توضیح</p>
          )}
          <p className="font-mono text-xs text-slate-500" dir="ltr">
            {step.stepKey}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <form action={upAction}>
            <input type="hidden" name="formId" value={formId} />
            <input type="hidden" name="stepId" value={step.id} />
            <IconButton
              label="انتقال مرحله به بالا"
              pending={upPending}
              disabled={isFirst}
            >
              ↑
            </IconButton>
          </form>
          <form action={downAction}>
            <input type="hidden" name="formId" value={formId} />
            <input type="hidden" name="stepId" value={step.id} />
            <IconButton
              label="انتقال مرحله به پایین"
              pending={downPending}
              disabled={isLast}
            >
              ↓
            </IconButton>
          </form>
          <button
            type="button"
            onClick={onToggleExpand}
            aria-expanded={expanded}
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-border bg-surface px-4 text-sm font-medium text-foreground hover:bg-background focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
          >
            {expanded ? "جمع کردن" : "گستردن"}
          </button>
          <button
            type="button"
            onClick={onStartEdit}
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-border bg-surface px-4 text-sm font-medium text-foreground hover:bg-background focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
          >
            ویرایش
          </button>
          <button
            type="button"
            onClick={onRequestDelete}
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-red-200 bg-red-50 px-4 text-sm font-medium text-red-800 hover:bg-red-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
          >
            حذف
          </button>
        </div>
      </div>

      {statusMessage ? (
        <div className="border-t border-border px-4 py-2 sm:px-5">
          <ActionMessage
            error={statusIsError ? statusMessage : undefined}
            success={statusIsError ? undefined : statusMessage}
          />
        </div>
      ) : null}

      {editing ? (
        <form
          action={updateAction}
          className="space-y-3 border-t border-border px-4 py-4 sm:px-5"
          noValidate
        >
          <input type="hidden" name="formId" value={formId} />
          <input type="hidden" name="stepId" value={step.id} />
          <div>
            <label
              htmlFor={`edit-step-title-${step.id}`}
              className="text-sm font-medium text-primary"
            >
              عنوان
            </label>
            <input
              id={`edit-step-title-${step.id}`}
              name="title"
              type="text"
              required
              maxLength={200}
              defaultValue={updateState.values?.title ?? step.title}
              className={fieldInputClass(Boolean(updateState.fieldErrors?.title))}
            />
            {updateState.fieldErrors?.title ? (
              <p className="mt-1.5 text-sm text-red-700">
                {updateState.fieldErrors.title}
              </p>
            ) : null}
          </div>
          <div>
            <label
              htmlFor={`edit-step-description-${step.id}`}
              className="text-sm font-medium text-primary"
            >
              توضیح
            </label>
            <textarea
              id={`edit-step-description-${step.id}`}
              name="description"
              rows={2}
              maxLength={2000}
              defaultValue={
                updateState.values?.description ?? step.description ?? ""
              }
              className={fieldInputClass(false)}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={updatePending}
              className="inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-4 text-sm font-medium text-white disabled:opacity-60"
            >
              {updatePending ? "در حال ذخیره…" : "ذخیره"}
            </button>
            <button
              type="button"
              onClick={onCancelEdit}
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-border px-4 text-sm font-medium"
            >
              انصراف
            </button>
          </div>
        </form>
      ) : null}

      {pendingDelete ? (
        <div
          role="alertdialog"
          aria-labelledby={`delete-step-title-${step.id}`}
          className="space-y-3 border-t border-red-100 bg-red-50/60 px-4 py-4 sm:px-5"
        >
          <h5
            id={`delete-step-title-${step.id}`}
            className="text-sm font-semibold text-red-900"
          >
            حذف مرحله «{step.title}»
          </h5>
          <p className="text-sm leading-7 text-red-900/90">
            {fields.length > 0
              ? `${toPersianDigits(fields.length)} فیلد داخل این مرحله است. با تأیید، فیلدها حذف نمی‌شوند و به بخش «بدون مرحله» منتقل می‌شوند؛ سپس خود مرحله پاک می‌شود.`
              : "این مرحله فیلدی ندارد و پس از تأیید حذف می‌شود."}
          </p>
          <div className="flex flex-wrap gap-2">
            <form action={deleteAction}>
              <input type="hidden" name="formId" value={formId} />
              <input type="hidden" name="stepId" value={step.id} />
              <button
                type="submit"
                disabled={deletePending}
                className="inline-flex min-h-11 items-center justify-center rounded-xl bg-red-700 px-4 text-sm font-medium text-white disabled:opacity-60"
              >
                {deletePending ? "در حال حذف…" : "تأیید حذف"}
              </button>
            </form>
            <button
              type="button"
              onClick={onCancelDelete}
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-border bg-surface px-4 text-sm font-medium"
            >
              انصراف
            </button>
          </div>
        </div>
      ) : null}

      {expanded ? (
        <div className="border-t border-border px-4 py-4 sm:px-5">
          <StepFieldsList
            formId={formId}
            stepId={step.id}
            fields={fields}
            allSteps={allSteps}
          />
        </div>
      ) : null}
    </article>
  );
}

function StepFieldsList({
  formId,
  stepId,
  fields,
  allSteps,
}: {
  formId: string;
  stepId: string;
  fields: EditorField[];
  allSteps: EditorStep[];
}) {
  if (fields.length === 0) {
    return (
      <p className="text-sm leading-7 text-muted">
        هنوز فیلدی به این مرحله اختصاص داده نشده است. از بخش «فیلدهای بدون
        مرحله» یک فیلد انتخاب کنید.
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {fields.map((field, index) => (
        <FieldRow
          key={field.id}
          formId={formId}
          field={field}
          groupStepId={stepId}
          isFirst={index === 0}
          isLast={index === fields.length - 1}
          allSteps={allSteps}
        />
      ))}
    </ul>
  );
}

function UnassignedFieldsSection({
  formId,
  fields,
  steps,
}: {
  formId: string;
  fields: EditorField[];
  steps: EditorStep[];
}) {
  return (
    <section
      aria-labelledby="unassigned-fields-heading"
      className="rounded-xl border border-border bg-surface px-4 py-4 sm:px-5"
    >
      <div className="mb-4 space-y-1">
        <h3
          id="unassigned-fields-heading"
          className="text-sm font-semibold text-primary"
        >
          فیلدهای بدون مرحله
        </h3>
        <p className="text-sm leading-7 text-muted">
          این فیلدها در فرم باقی می‌مانند اما هنوز به هیچ مرحله‌ای وصل نشده‌اند.
        </p>
      </div>

      {fields.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border bg-background px-4 py-6 text-center text-sm text-muted">
          همه فیلدها به مراحل اختصاص داده شده‌اند، یا هنوز فیلدی در تب «فرم»
          ساخته نشده است.
        </p>
      ) : (
        <ul className="space-y-3">
          {fields.map((field, index) => (
            <FieldRow
              key={field.id}
              formId={formId}
              field={field}
              groupStepId={null}
              isFirst={index === 0}
              isLast={index === fields.length - 1}
              allSteps={steps}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

function FieldRow({
  formId,
  field,
  groupStepId,
  isFirst,
  isLast,
  allSteps,
}: {
  formId: string;
  field: EditorField;
  groupStepId: string | null;
  isFirst: boolean;
  isLast: boolean;
  allSteps: EditorStep[];
}) {
  const [upState, upAction, upPending] = useActionState(
    moveStepFieldUpAction,
    emptySimpleState,
  );
  const [downState, downAction, downPending] = useActionState(
    moveStepFieldDownAction,
    emptySimpleState,
  );
  const [assignState, assignAction, assignPending] = useActionState(
    assignFieldToStepAction,
    emptySimpleState,
  );

  const otherSteps = allSteps.filter((step) => step.id !== groupStepId);
  const message =
    upState.formError ||
    downState.formError ||
    assignState.formError ||
    upState.successMessage ||
    downState.successMessage ||
    assignState.successMessage;
  const isError = Boolean(
    upState.formError || downState.formError || assignState.formError,
  );

  return (
    <li className="rounded-xl border border-border bg-background px-3 py-3 sm:px-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">{field.label}</p>
          <p className="mt-0.5 text-xs text-muted">
            {getFormFieldTypeLabel(field.type)}
            <span className="mx-1">·</span>
            <span className="font-mono" dir="ltr">
              {field.fieldKey}
            </span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <form action={upAction}>
            <input type="hidden" name="formId" value={formId} />
            <input type="hidden" name="fieldId" value={field.id} />
            <input type="hidden" name="stepId" value={groupStepId ?? ""} />
            <IconButton
              label="انتقال فیلد به بالا"
              pending={upPending}
              disabled={isFirst}
            >
              ↑
            </IconButton>
          </form>
          <form action={downAction}>
            <input type="hidden" name="formId" value={formId} />
            <input type="hidden" name="fieldId" value={field.id} />
            <input type="hidden" name="stepId" value={groupStepId ?? ""} />
            <IconButton
              label="انتقال فیلد به پایین"
              pending={downPending}
              disabled={isLast}
            >
              ↓
            </IconButton>
          </form>

          {groupStepId ? (
            <form action={assignAction}>
              <input type="hidden" name="formId" value={formId} />
              <input type="hidden" name="fieldId" value={field.id} />
              <input type="hidden" name="targetStepId" value="" />
              <button
                type="submit"
                disabled={assignPending}
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-border bg-surface px-3 text-sm font-medium disabled:opacity-60"
              >
                {assignPending ? "…" : "جدا کردن از مرحله"}
              </button>
            </form>
          ) : null}

          {otherSteps.length > 0 ? (
            <form action={assignAction} className="flex flex-wrap items-center gap-2">
              <input type="hidden" name="formId" value={formId} />
              <input type="hidden" name="fieldId" value={field.id} />
              <label className="sr-only" htmlFor={`assign-${field.id}`}>
                انتقال به مرحله
              </label>
              <select
                id={`assign-${field.id}`}
                name="targetStepId"
                required
                defaultValue=""
                className="min-h-11 rounded-xl border border-border bg-surface px-3 text-sm"
              >
                <option value="" disabled>
                  انتقال به مرحله…
                </option>
                {otherSteps.map((step) => (
                  <option key={step.id} value={step.id}>
                    {step.title}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                disabled={assignPending}
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-border bg-surface px-3 text-sm font-medium disabled:opacity-60"
              >
                {assignPending ? "…" : "اعمال"}
              </button>
            </form>
          ) : null}
        </div>
      </div>
      {message ? (
        <div className="mt-2">
          <ActionMessage
            error={isError ? message : undefined}
            success={isError ? undefined : message}
          />
        </div>
      ) : null}
    </li>
  );
}
