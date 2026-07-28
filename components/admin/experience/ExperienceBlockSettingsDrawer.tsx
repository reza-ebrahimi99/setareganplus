"use client";

import {
  useActionState,
  useEffect,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  updateBlockAction,
  type ExperienceActionState,
} from "@/app/admin/(dashboard)/registrations/flows/[id]/experience/actions";
import { MediaPickerField } from "@/components/admin/media/MediaPickerField";
import type { ExperienceAdminBlockDto } from "@/components/admin/experience/types";
import { JalaliDateTimeFields } from "@/components/datetime/JalaliDateTimeFields";
import type { BlockMediaRole } from "@/lib/experience/media-types";

const emptyState: ExperienceActionState = {};

const MEDIA_ROLE_LABELS: Record<BlockMediaRole, string> = {
  primary: "تصویر اصلی",
  mobile: "تصویر موبایل",
  background: "پس‌زمینه",
};

type ExperienceBlockSettingsDrawerProps = {
  flowId: string;
  block: ExperienceAdminBlockDto;
  canManage: boolean;
  children: ReactNode;
  onClose: () => void;
};

export function ExperienceBlockSettingsDrawer({
  flowId,
  block,
  canManage,
  children,
  onClose,
}: ExperienceBlockSettingsDrawerProps) {
  const [state, action, pending] = useActionState(updateBlockAction, emptyState);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    function onBeforeUnload(event: BeforeUnloadEvent) {
      if (!dirty) return;
      event.preventDefault();
      event.returnValue = "";
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  useEffect(() => {
    if (state.successMessage) setDirty(false);
  }, [state.successMessage]);

  function requestClose() {
    if (dirty) {
      const ok = window.confirm(
        "تغییرات ذخیره‌نشده دارید. بدون ذخیره ببندید؟",
      );
      if (!ok) return;
    }
    onClose();
  }

  function onInput() {
    setDirty(true);
  }

  function onSubmit(_event: FormEvent<HTMLFormElement>) {
    // dirty cleared on success via useEffect
  }

  return (
    <div className="flex h-full flex-col bg-white">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-primary">{block.labelFa}</p>
          <p className="text-xs text-muted">{block.type}</p>
        </div>
        <button
          type="button"
          onClick={requestClose}
          className="min-h-11 rounded-xl border border-border px-3 text-sm"
        >
          بستن
        </button>
      </div>

      <form
        action={action}
        onInput={onInput}
        onChange={onInput}
        onSubmit={onSubmit}
        className="flex min-h-0 flex-1 flex-col"
      >
        <input type="hidden" name="flowId" value={flowId} />
        <input type="hidden" name="blockId" value={block.id} />

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
          {state.formError ? (
            <div
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
            >
              {state.formError}
            </div>
          ) : null}
          {state.successMessage ? (
            <div
              role="status"
              className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900"
            >
              {state.successMessage}
            </div>
          ) : null}

          {children}

          <label className="block text-sm">
            <span className="mb-1.5 block text-muted">وضعیت بلوک</span>
            <select
              name="status"
              defaultValue={block.enabled ? "PUBLISHED" : "DISABLED"}
              disabled={!canManage || pending}
              className="min-h-11 w-full rounded-xl border border-border bg-white px-3 py-2.5 disabled:opacity-60"
            >
              <option value="PUBLISHED">فعال</option>
              <option value="DISABLED">غیرفعال</option>
            </select>
          </label>

          <fieldset className="space-y-3 rounded-xl border border-border p-3">
            <legend className="px-1 text-sm text-muted">زمان‌بندی نمایش</legend>
            <div>
              <label
                htmlFor={`opensAt-${block.id}`}
                className="mb-1.5 block text-sm text-muted"
              >
                شروع نمایش
              </label>
              <JalaliDateTimeFields
                id={`opensAt-${block.id}`}
                name="opensAt"
                defaultValueIso={block.opensAtIso}
                disabled={!canManage || pending}
              />
            </div>
            <div>
              <label
                htmlFor={`closesAt-${block.id}`}
                className="mb-1.5 block text-sm text-muted"
              >
                پایان نمایش
              </label>
              <JalaliDateTimeFields
                id={`closesAt-${block.id}`}
                name="closesAt"
                defaultValueIso={block.closesAtIso}
                disabled={!canManage || pending}
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="clearSchedule"
                value="true"
                disabled={!canManage || pending}
              />
              پاک کردن زمان‌بندی
            </label>
          </fieldset>

          {block.mediaRoles.length > 0 ? (
            <div className="space-y-3">
              {block.mediaRoles.map((role) => {
                const value = block.mediaValues[role];
                return (
                  <MediaPickerField
                    key={role}
                    name={`media_${role}`}
                    label={MEDIA_ROLE_LABELS[role] ?? role}
                    value={value?.mediaId ?? null}
                    previewUrl={value?.url ?? null}
                    previewTitle={value?.title ?? null}
                    disabled={!canManage || pending}
                  />
                );
              })}
            </div>
          ) : null}
        </div>

        {canManage ? (
          <div className="border-t border-border px-4 py-3">
            <button
              type="submit"
              disabled={pending}
              className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-primary px-4 text-sm font-medium text-white disabled:opacity-60"
            >
              {pending ? "در حال ذخیره..." : "ذخیره بلوک"}
            </button>
            <p className="mt-2 text-center text-xs text-muted">
              ذخیره خودکار وجود ندارد.
            </p>
          </div>
        ) : null}
      </form>
    </div>
  );
}
