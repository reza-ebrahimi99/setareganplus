"use client";

import Link from "next/link";
import { useActionState, useEffect, useMemo, useState } from "react";
import {
  createFieldAction,
  deleteFieldAction,
  moveFieldDownAction,
  moveFieldUpAction,
  updateFieldAction,
  type FieldActionState,
  type SimpleFieldActionState,
} from "@/app/admin/(dashboard)/forms/field-actions";
import { choiceOptionsToText } from "@/lib/forms/choice-options";
import {
  FORM_FIELD_TYPE_OPTIONS,
  getFormFieldTypeLabel,
  isChoiceFieldType,
} from "@/lib/forms/form-field-type-labels";
import type { EditorField } from "@/lib/forms/load-form-editor";
import { toPersianDigits } from "@/lib/persian";
import type { FormFieldType } from "@/generated/prisma/enums";

type FormEditorProps = {
  formId: string;
  fields: EditorField[];
};

const emptyCreateState: FieldActionState = {};
const emptySimpleState: SimpleFieldActionState = {};

function fieldClassName(hasError: boolean): string {
  const base =
    "mt-1.5 w-full rounded-xl border bg-surface px-3 py-2.5 text-sm text-foreground outline-none transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary";
  return hasError
    ? `${base} border-red-400`
    : `${base} border-border hover:border-secondary/40`;
}

function FieldEditorPanel({
  formId,
  mode,
  field,
  onCancelEdit,
}: {
  formId: string;
  mode: "create" | "edit";
  field: EditorField | null;
  onCancelEdit: () => void;
}) {
  const action = mode === "create" ? createFieldAction : updateFieldAction;
  const [state, formAction, pending] = useActionState(action, emptyCreateState);

  const [type, setType] = useState<string>(
    field?.type ?? FORM_FIELD_TYPE_OPTIONS[0]?.value ?? "SHORT_TEXT",
  );

  useEffect(() => {
    setType(field?.type ?? FORM_FIELD_TYPE_OPTIONS[0]?.value ?? "SHORT_TEXT");
  }, [field?.id, field?.type, mode]);

  useEffect(() => {
    if (state.values?.type) {
      setType(state.values.type);
    }
  }, [state.values?.type]);

  useEffect(() => {
    if (mode === "create" && state.successMessage) {
      setType(FORM_FIELD_TYPE_OPTIONS[0]?.value ?? "SHORT_TEXT");
    }
  }, [mode, state.successMessage]);

  const values = state.values;
  const errors = state.fieldErrors;
  const showOptions = isChoiceFieldType(type as FormFieldType);

  const defaultOptionsText =
    values?.optionsText ??
    (field ? choiceOptionsToText(field.config) : "");

  return (
    <form action={formAction} className="space-y-4" noValidate>
      <input type="hidden" name="formId" value={formId} />
      {mode === "edit" && field ? (
        <input type="hidden" name="fieldId" value={field.id} />
      ) : null}

      <div>
        <h3 className="text-base font-semibold text-primary">
          {mode === "create" ? "افزودن سؤال جدید" : "ویرایش سؤال"}
        </h3>
        <p className="mt-1 text-sm text-muted">
          فقط نسخه پیش‌نویس قابل ویرایش است.
        </p>
      </div>

      {state.formError ? (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-7 text-red-800"
        >
          {state.formError}
        </div>
      ) : null}

      {state.successMessage ? (
        <div
          role="status"
          className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-7 text-emerald-900"
        >
          {state.successMessage}
        </div>
      ) : null}

      <div>
        <label htmlFor="field-label" className="text-sm font-medium text-primary">
          برچسب سؤال
        </label>
        <input
          id="field-label"
          name="label"
          type="text"
          required
          maxLength={200}
          key={`label-${field?.id ?? "new"}-${state.successMessage ?? ""}`}
          defaultValue={values?.label ?? field?.label ?? ""}
          aria-invalid={errors?.label ? true : undefined}
          className={fieldClassName(Boolean(errors?.label))}
        />
        {errors?.label ? (
          <p className="mt-1.5 text-sm text-red-700">{errors.label}</p>
        ) : null}
      </div>

      <div>
        <label
          htmlFor="field-key"
          className="text-sm font-medium text-primary"
        >
          کلید فیلد
        </label>
        <input
          id="field-key"
          name="fieldKey"
          type="text"
          required
          dir="ltr"
          maxLength={64}
          key={`key-${field?.id ?? "new"}-${state.successMessage ?? ""}`}
          defaultValue={values?.fieldKey ?? field?.fieldKey ?? ""}
          aria-invalid={errors?.fieldKey ? true : undefined}
          className={`${fieldClassName(Boolean(errors?.fieldKey))} font-mono`}
          placeholder="first_name"
        />
        <p className="mt-1.5 text-xs leading-6 text-muted">
          برای گزارش‌گیری و نگاشت بعدی استفاده می‌شود.
        </p>
        {errors?.fieldKey ? (
          <p className="mt-1.5 text-sm text-red-700">{errors.fieldKey}</p>
        ) : null}
      </div>

      <div>
        <label
          htmlFor="field-type"
          className="text-sm font-medium text-primary"
        >
          نوع فیلد
        </label>
        <select
          id="field-type"
          name="type"
          required
          value={type}
          onChange={(event) => setType(event.target.value)}
          aria-invalid={errors?.type ? true : undefined}
          className={fieldClassName(Boolean(errors?.type))}
        >
          {FORM_FIELD_TYPE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {errors?.type ? (
          <p className="mt-1.5 text-sm text-red-700">{errors.type}</p>
        ) : null}
      </div>

      <div className="flex items-center gap-2">
        <input
          id="field-required"
          name="required"
          type="checkbox"
          value="true"
          key={`required-${field?.id ?? "new"}-${state.successMessage ?? ""}`}
          defaultChecked={values?.required ?? field?.required ?? false}
          className="size-4 rounded border-border text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
        />
        <label htmlFor="field-required" className="text-sm text-foreground">
          پاسخ الزامی است
        </label>
      </div>

      <div>
        <label
          htmlFor="field-help"
          className="text-sm font-medium text-primary"
        >
          متن راهنما (اختیاری)
        </label>
        <input
          id="field-help"
          name="helpText"
          type="text"
          maxLength={500}
          key={`help-${field?.id ?? "new"}-${state.successMessage ?? ""}`}
          defaultValue={values?.helpText ?? field?.helpText ?? ""}
          className={fieldClassName(Boolean(errors?.helpText))}
        />
        {errors?.helpText ? (
          <p className="mt-1.5 text-sm text-red-700">{errors.helpText}</p>
        ) : null}
      </div>

      <div>
        <label
          htmlFor="field-placeholder"
          className="text-sm font-medium text-primary"
        >
          متن جایگزین (اختیاری)
        </label>
        <input
          id="field-placeholder"
          name="placeholder"
          type="text"
          maxLength={200}
          key={`ph-${field?.id ?? "new"}-${state.successMessage ?? ""}`}
          defaultValue={values?.placeholder ?? field?.placeholder ?? ""}
          className={fieldClassName(Boolean(errors?.placeholder))}
        />
        {errors?.placeholder ? (
          <p className="mt-1.5 text-sm text-red-700">{errors.placeholder}</p>
        ) : null}
      </div>

      {showOptions ? (
        <div>
          <label
            htmlFor="field-options"
            className="text-sm font-medium text-primary"
          >
            گزینه‌ها (هر خط یک گزینه)
          </label>
          <textarea
            id="field-options"
            name="optionsText"
            rows={5}
            key={`opts-${field?.id ?? "new"}-${state.successMessage ?? ""}`}
            defaultValue={defaultOptionsText}
            aria-invalid={errors?.optionsText ? true : undefined}
            className={fieldClassName(Boolean(errors?.optionsText))}
            placeholder={"گزینه اول\nگزینه دوم"}
          />
          <p className="mt-1.5 text-xs leading-6 text-muted">
            حداقل دو گزینه. برچسب فارسی حفظ می‌شود و مقدار پایدار به‌صورت
            option-1، option-2 ذخیره می‌گردد.
          </p>
          {errors?.optionsText ? (
            <p className="mt-1.5 text-sm text-red-700">{errors.optionsText}</p>
          ) : null}
        </div>
      ) : (
        <input type="hidden" name="optionsText" value="" />
      )}

      <div className="flex flex-col-reverse gap-3 border-t border-border pt-4 sm:flex-row sm:justify-between">
        {mode === "edit" ? (
          <button
            type="button"
            onClick={onCancelEdit}
            className="inline-flex items-center justify-center rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-background"
          >
            انصراف
          </button>
        ) : (
          <span />
        )}
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center justify-center rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-primary/92 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending
            ? "در حال ذخیره..."
            : mode === "create"
              ? "افزودن سؤال"
              : "ذخیره تغییرات"}
        </button>
      </div>
    </form>
  );
}

function QuestionListItem({
  formId,
  field,
  index,
  total,
  selected,
  onSelect,
}: {
  formId: string;
  field: EditorField;
  index: number;
  total: number;
  selected: boolean;
  onSelect: () => void;
}) {
  const [upState, upAction, upPending] = useActionState(
    moveFieldUpAction,
    emptySimpleState,
  );
  const [downState, downAction, downPending] = useActionState(
    moveFieldDownAction,
    emptySimpleState,
  );
  const [deleteState, deleteAction, deletePending] = useActionState(
    deleteFieldAction,
    emptySimpleState,
  );

  const moveError = upState.formError ?? downState.formError;
  const deleteError = deleteState.formError;

  return (
    <li
      className={`rounded-xl border p-4 transition-colors ${
        selected
          ? "border-secondary/50 bg-secondary/5"
          : "border-border bg-surface"
      }`}
    >
      <div className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <button
            type="button"
            onClick={onSelect}
            className="min-w-0 flex-1 text-start"
          >
            <p className="font-medium text-primary">
              <span className="ms-1 text-slate-400">
                {toPersianDigits(index + 1)}.
              </span>{" "}
              {field.label}
            </p>
            <p className="mt-1 text-xs text-muted">
              {getFormFieldTypeLabel(field.type)}
              {field.required ? " · الزامی" : ""}
              {" · "}
              <span className="font-mono" dir="ltr">
                {field.fieldKey}
              </span>
            </p>
          </button>
          <button
            type="button"
            onClick={onSelect}
            className="shrink-0 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-background"
          >
            ویرایش
          </button>
        </div>

        {(moveError || deleteError) && (
          <p role="alert" className="text-sm text-red-700">
            {moveError ?? deleteError}
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          <form action={upAction}>
            <input type="hidden" name="formId" value={formId} />
            <input type="hidden" name="fieldId" value={field.id} />
            <button
              type="submit"
              disabled={index === 0 || upPending}
              className="rounded-lg border border-border px-3 py-1.5 text-xs disabled:cursor-not-allowed disabled:opacity-40"
            >
              بالا
            </button>
          </form>
          <form action={downAction}>
            <input type="hidden" name="formId" value={formId} />
            <input type="hidden" name="fieldId" value={field.id} />
            <button
              type="submit"
              disabled={index === total - 1 || downPending}
              className="rounded-lg border border-border px-3 py-1.5 text-xs disabled:cursor-not-allowed disabled:opacity-40"
            >
              پایین
            </button>
          </form>
          <form
            action={deleteAction}
            onSubmit={(event) => {
              if (
                !window.confirm(
                  `سؤال «${field.label}» حذف شود؟ این عمل قابل بازگشت نیست.`,
                )
              ) {
                event.preventDefault();
              }
            }}
          >
            <input type="hidden" name="formId" value={formId} />
            <input type="hidden" name="fieldId" value={field.id} />
            <button
              type="submit"
              disabled={deletePending}
              className="rounded-lg border border-red-200 px-3 py-1.5 text-xs text-red-700 hover:bg-red-50 disabled:opacity-40"
            >
              حذف
            </button>
          </form>
        </div>
      </div>
    </li>
  );
}

export function FormEditor({ formId, fields }: FormEditorProps) {
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);

  const selectedField = useMemo(
    () => fields.find((field) => field.id === selectedFieldId) ?? null,
    [fields, selectedFieldId],
  );

  useEffect(() => {
    if (mode === "edit" && selectedFieldId && !selectedField) {
      setMode("create");
      setSelectedFieldId(null);
    }
  }, [mode, selectedField, selectedFieldId]);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
      <section className="admin-card min-w-0 p-4 sm:p-5" aria-labelledby="questions-heading">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 id="questions-heading" className="text-base font-semibold text-primary">
              پرسش‌ها
            </h2>
            <p className="mt-1 text-sm text-muted">
              {toPersianDigits(fields.length)} سؤال در نسخه پیش‌نویس
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setMode("create");
              setSelectedFieldId(null);
            }}
            className="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-primary/92"
          >
            افزودن سؤال
          </button>
        </div>

        {fields.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border px-4 py-10 text-center">
            <p className="text-sm leading-7 text-muted">
              هنوز هیچ سؤالی به این فرم اضافه نشده است.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {fields.map((field, index) => (
              <QuestionListItem
                key={field.id}
                formId={formId}
                field={field}
                index={index}
                total={fields.length}
                selected={selectedFieldId === field.id}
                onSelect={() => {
                  setSelectedFieldId(field.id);
                  setMode("edit");
                }}
              />
            ))}
          </ul>
        )}
      </section>

      <aside className="admin-card min-w-0 p-4 sm:p-5 lg:sticky lg:top-6 lg:self-start">
        <FieldEditorPanel
          key={`${mode}-${selectedField?.id ?? "new"}`}
          formId={formId}
          mode={mode}
          field={mode === "edit" ? selectedField : null}
          onCancelEdit={() => {
            setMode("create");
            setSelectedFieldId(null);
          }}
        />
        <p className="mt-5 text-xs leading-6 text-muted">
          بازگشت به{" "}
          <Link href="/admin/forms" className="text-primary underline-offset-2 hover:underline">
            فهرست فرم‌ها
          </Link>
        </p>
      </aside>
    </div>
  );
}
