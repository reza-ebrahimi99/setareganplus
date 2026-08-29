"use client";

import { useEffect, useMemo, useState } from "react";
import { readChoiceConfig } from "@/lib/forms/choice-options";
import {
  getVisibilityOperatorLabel,
  isVisibilitySourceType,
  operatorNeedsValue,
  operatorsForSourceType,
  resolveFieldVisibilityCondition,
  type VisibilityOperator,
} from "@/lib/forms/field-visibility";
import type { EditorField } from "@/lib/forms/load-form-editor";

function fieldClassName(hasError: boolean): string {
  const base =
    "mt-1.5 w-full rounded-xl border bg-surface px-3 py-2.5 text-sm text-foreground outline-none transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary";
  return hasError
    ? `${base} border-red-400`
    : `${base} border-border hover:border-secondary/40`;
}

type VisibilityConditionEditorProps = {
  field: EditorField | null;
  allFields: EditorField[];
  values?: {
    visibilityMode?: string;
    visibilitySourceFieldKey?: string;
    visibilityOperator?: string;
    visibilityValue?: string;
  };
  error?: string;
};

/**
 * No-code draft editor for FormField.visibilityConditions.
 */
export function VisibilityConditionEditor({
  field,
  allFields,
  values,
  error,
}: VisibilityConditionEditorProps) {
  const parsedExisting = resolveFieldVisibilityCondition({
    visibilityConditions: field?.visibilityConditions ?? null,
    config: field?.config,
  });

  const initialMode =
    values?.visibilityMode ??
    (parsedExisting.ok && parsedExisting.condition ? "conditional" : "always");
  const initialSource =
    values?.visibilitySourceFieldKey ??
    (parsedExisting.ok ? parsedExisting.condition?.sourceFieldKey ?? "" : "");
  const initialOperator =
    values?.visibilityOperator ??
    (parsedExisting.ok
      ? parsedExisting.condition?.operator ?? "equals"
      : "equals");
  const initialValueRaw =
    values?.visibilityValue ??
    (parsedExisting.ok && parsedExisting.condition?.value !== undefined
      ? String(parsedExisting.condition.value)
      : "");

  const [mode, setMode] = useState(initialMode);
  const [sourceKey, setSourceKey] = useState(initialSource);
  const [operator, setOperator] = useState(initialOperator);
  const [compareValue, setCompareValue] = useState(initialValueRaw);

  useEffect(() => {
    setMode(initialMode);
    setSourceKey(initialSource);
    setOperator(initialOperator);
    setCompareValue(initialValueRaw);
  }, [field?.id, initialMode, initialSource, initialOperator, initialValueRaw]);

  const sourceCandidates = useMemo(() => {
    const dependentSort = field?.sortOrder ?? Number.POSITIVE_INFINITY;
    return allFields.filter(
      (candidate) =>
        candidate.fieldKey !== field?.fieldKey &&
        candidate.sortOrder < dependentSort &&
        isVisibilitySourceType(candidate.type),
    );
  }, [allFields, field?.fieldKey, field?.sortOrder]);

  const selectedSource =
    sourceCandidates.find((candidate) => candidate.fieldKey === sourceKey) ??
    null;

  const operatorOptions = selectedSource
    ? operatorsForSourceType(selectedSource.type)
    : (["equals", "notEquals", "isAnswered", "isNotAnswered"] as VisibilityOperator[]);

  useEffect(() => {
    if (
      selectedSource &&
      !operatorsForSourceType(selectedSource.type).includes(
        operator as VisibilityOperator,
      )
    ) {
      setOperator(operatorsForSourceType(selectedSource.type)[0] ?? "equals");
    }
  }, [selectedSource, operator]);

  const activeOperator = (
    operatorOptions.includes(operator as VisibilityOperator)
      ? operator
      : operatorOptions[0] ?? "equals"
  ) as VisibilityOperator;

  const needsValue = operatorNeedsValue(activeOperator);

  const choiceOptions = selectedSource
    ? readChoiceConfig(selectedSource.config)?.options ?? null
    : null;

  const warning =
    !parsedExisting.ok && field
      ? parsedExisting.error
      : sourceCandidates.length === 0 && mode === "conditional"
        ? "برای تعریف شرط، حداقل یک سؤال سازگار قبل از این سؤال لازم است."
        : null;

  return (
    <fieldset className="space-y-3 rounded-xl border border-border bg-background/60 px-3 py-3">
      <legend className="px-1 text-sm font-medium text-primary">
        شرط نمایش سؤال
      </legend>

      <div className="space-y-2">
        <label className="flex items-center gap-2 text-sm text-foreground">
          <input
            type="radio"
            name="visibilityMode"
            value="always"
            checked={mode === "always"}
            onChange={() => setMode("always")}
            className="size-4 border-border text-primary"
          />
          همیشه نمایش داده شود
        </label>
        <label className="flex items-center gap-2 text-sm text-foreground">
          <input
            type="radio"
            name="visibilityMode"
            value="conditional"
            checked={mode === "conditional"}
            onChange={() => setMode("conditional")}
            className="size-4 border-border text-primary"
          />
          نمایش داده شود اگر...
        </label>
      </div>

      {mode === "conditional" ? (
        <div className="space-y-3 border-t border-border pt-3">
          <div>
            <label
              htmlFor="visibility-source"
              className="text-sm font-medium text-primary"
            >
              سؤال مبنا
            </label>
            <select
              id="visibility-source"
              name="visibilitySourceFieldKey"
              value={sourceKey}
              onChange={(event) => setSourceKey(event.target.value)}
              className={fieldClassName(Boolean(error))}
            >
              <option value="">انتخاب کنید</option>
              {sourceCandidates.map((candidate) => (
                <option key={candidate.id} value={candidate.fieldKey}>
                  {candidate.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="visibility-operator"
              className="text-sm font-medium text-primary"
            >
              عملگر
            </label>
            <select
              id="visibility-operator"
              name="visibilityOperator"
              value={activeOperator}
              onChange={(event) => setOperator(event.target.value)}
              className={fieldClassName(Boolean(error))}
            >
              {operatorOptions.map((op) => (
                <option key={op} value={op}>
                  {getVisibilityOperatorLabel(op)}
                </option>
              ))}
            </select>
          </div>

          {needsValue ? (
            <div>
              <label
                htmlFor="visibility-value"
                className="text-sm font-medium text-primary"
              >
                مقدار
              </label>
              {selectedSource?.type === "CONSENT" ? (
                <select
                  id="visibility-value"
                  name="visibilityValue"
                  value={compareValue || "true"}
                  onChange={(event) => setCompareValue(event.target.value)}
                  className={fieldClassName(Boolean(error))}
                >
                  <option value="true">بله</option>
                  <option value="false">خیر</option>
                </select>
              ) : choiceOptions ? (
                <select
                  id="visibility-value"
                  name="visibilityValue"
                  value={compareValue}
                  onChange={(event) => setCompareValue(event.target.value)}
                  className={fieldClassName(Boolean(error))}
                >
                  <option value="">انتخاب کنید</option>
                  {choiceOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  id="visibility-value"
                  name="visibilityValue"
                  type="text"
                  value={compareValue}
                  onChange={(event) => setCompareValue(event.target.value)}
                  className={fieldClassName(Boolean(error))}
                />
              )}
            </div>
          ) : (
            <input type="hidden" name="visibilityValue" value="" />
          )}
        </div>
      ) : (
        <>
          <input type="hidden" name="visibilitySourceFieldKey" value="" />
          <input type="hidden" name="visibilityOperator" value="" />
          <input type="hidden" name="visibilityValue" value="" />
        </>
      )}

      {warning ? (
        <p className="text-xs leading-6 text-amber-800" role="status">
          {warning}
        </p>
      ) : null}
      {error ? (
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}
