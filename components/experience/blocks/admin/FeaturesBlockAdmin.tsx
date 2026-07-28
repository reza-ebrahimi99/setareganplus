"use client";

import { useState } from "react";
import {
  ADMIN_INPUT_CLASS,
  EditorShell,
  FieldError,
} from "@/components/experience/blocks/admin/field-helpers";
import type {
  FeatureItemConfig,
  FeaturesBlockConfig,
} from "@/lib/experience/blocks/features";
import type { ExperienceAdminBlockEditorProps } from "@/lib/experience/definition-types";

const MAX_ITEMS = 12;

function emptyItem(): FeatureItemConfig {
  return { title: "", description: "", iconKey: "" };
}

export function FeaturesBlockAdmin({
  labelFa,
  descriptionFa,
  config,
  fieldErrors,
  disabled,
}: ExperienceAdminBlockEditorProps<FeaturesBlockConfig>) {
  const [items, setItems] = useState<FeatureItemConfig[]>(() =>
    config.items.length > 0
      ? config.items.map((item) => ({
          title: item.title,
          description: item.description ?? "",
          iconKey: item.iconKey ?? "",
        }))
      : [emptyItem()],
  );

  function updateItem(index: number, patch: Partial<FeatureItemConfig>) {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    );
  }

  function addItem() {
    if (disabled || items.length >= MAX_ITEMS) return;
    setItems((prev) => [...prev, emptyItem()]);
  }

  function removeItem(index: number) {
    if (disabled || items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  function moveItem(index: number, direction: -1 | 1) {
    if (disabled) return;
    const next = index + direction;
    if (next < 0 || next >= items.length) return;
    setItems((prev) => {
      const copy = [...prev];
      const [row] = copy.splice(index, 1);
      copy.splice(next, 0, row);
      return copy;
    });
  }

  return (
    <EditorShell labelFa={labelFa} descriptionFa={descriptionFa} disabled={disabled}>
      <label className="block text-sm">
        <span className="mb-1.5 block text-muted">عنوان بخش (اختیاری)</span>
        <input
          name="title"
          defaultValue={config.title ?? ""}
          disabled={disabled}
          className={ADMIN_INPUT_CLASS}
        />
        <FieldError message={fieldErrors.title} />
      </label>

      <input type="hidden" name="itemCount" value={items.length} />

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium text-primary">آیتم‌ها</p>
          <button
            type="button"
            onClick={addItem}
            disabled={disabled || items.length >= MAX_ITEMS}
            className="min-h-9 rounded-xl border border-border bg-white px-3 text-sm text-primary disabled:opacity-60"
          >
            افزودن آیتم
          </button>
        </div>
        <FieldError message={fieldErrors.items} />

        {items.map((item, index) => (
          <fieldset
            key={index}
            className="space-y-2 rounded-xl border border-border p-3"
            disabled={disabled}
          >
            <legend className="px-1 text-sm text-muted">آیتم {index + 1}</legend>

            <label className="block text-sm">
              <span className="mb-1 block text-muted">عنوان</span>
              <input
                name={`itemTitle_${index}`}
                value={item.title}
                onChange={(e) => updateItem(index, { title: e.target.value })}
                disabled={disabled}
                className={ADMIN_INPUT_CLASS}
              />
              <FieldError message={fieldErrors[`itemTitle_${index}`]} />
            </label>

            <label className="block text-sm">
              <span className="mb-1 block text-muted">توضیح (اختیاری)</span>
              <textarea
                name={`itemDescription_${index}`}
                value={item.description ?? ""}
                onChange={(e) =>
                  updateItem(index, { description: e.target.value })
                }
                disabled={disabled}
                rows={2}
                className={ADMIN_INPUT_CLASS}
              />
              <FieldError message={fieldErrors[`itemDescription_${index}`]} />
            </label>

            <label className="block text-sm">
              <span className="mb-1 block text-muted">کلید آیکن (اختیاری)</span>
              <input
                name={`itemIconKey_${index}`}
                value={item.iconKey ?? ""}
                onChange={(e) => updateItem(index, { iconKey: e.target.value })}
                disabled={disabled}
                className={ADMIN_INPUT_CLASS}
                dir="ltr"
              />
              <FieldError message={fieldErrors[`itemIconKey_${index}`]} />
            </label>

            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                onClick={() => moveItem(index, -1)}
                disabled={disabled || index === 0}
                className="min-h-9 rounded-xl border border-border bg-white px-3 text-sm disabled:opacity-60"
              >
                بالا
              </button>
              <button
                type="button"
                onClick={() => moveItem(index, 1)}
                disabled={disabled || index === items.length - 1}
                className="min-h-9 rounded-xl border border-border bg-white px-3 text-sm disabled:opacity-60"
              >
                پایین
              </button>
              <button
                type="button"
                onClick={() => removeItem(index)}
                disabled={disabled || items.length <= 1}
                className="min-h-9 rounded-xl border border-red-200 bg-red-50 px-3 text-sm text-red-800 disabled:opacity-60"
              >
                حذف
              </button>
            </div>
          </fieldset>
        ))}
      </div>
    </EditorShell>
  );
}
