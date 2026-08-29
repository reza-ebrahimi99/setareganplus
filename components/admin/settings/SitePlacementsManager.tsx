"use client";

import Link from "next/link";
import { useActionState, useMemo, useState } from "react";
import {
  disableSitePlacementAction,
  resetSitePlacementAction,
  upsertSitePlacementAction,
  type PlacementActionState,
} from "@/app/admin/(dashboard)/settings/site-placements/actions";
import type { AdminPlacementCardData } from "@/lib/site/load-admin-site-placements";
import {
  displayModesForContent,
  getSiteDisplayModeLabel,
} from "@/lib/site/placement-registry";

type SitePlacementsManagerProps = {
  forms: Array<{
    id: string;
    slug: string;
    title: string;
    purposeLabel: string;
  }>;
  bookingServices: Array<{
    id: string;
    slug: string;
    title: string;
    branchName: string | null;
  }>;
  placements: AdminPlacementCardData[];
};

const emptyState: PlacementActionState = {};

function fieldClass(hasError: boolean): string {
  const base =
    "mt-1.5 w-full rounded-xl border bg-white px-3 py-2.5 text-sm outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary";
  return hasError ? `${base} border-red-400` : `${base} border-border`;
}

function PlacementCard({
  placement,
  forms,
  bookingServices,
}: {
  placement: AdminPlacementCardData;
  forms: SitePlacementsManagerProps["forms"];
  bookingServices: SitePlacementsManagerProps["bookingServices"];
}) {
  const [saveState, saveAction, savePending] = useActionState(
    upsertSitePlacementAction,
    emptyState,
  );
  const [disableState, disableAction, disablePending] = useActionState(
    disableSitePlacementAction,
    emptyState,
  );
  const [resetState, resetAction, resetPending] = useActionState(
    resetSitePlacementAction,
    emptyState,
  );

  const relevantSave =
    saveState.placementKey === placement.key ? saveState : emptyState;
  const relevantDisable =
    disableState.placementKey === placement.key ? disableState : emptyState;
  const relevantReset =
    resetState.placementKey === placement.key ? resetState : emptyState;

  const statusMessage =
    relevantSave.successMessage ??
    relevantDisable.successMessage ??
    relevantReset.successMessage;
  const errorMessage =
    relevantSave.formError ??
    relevantDisable.formError ??
    relevantReset.formError;

  const contentKind = placement.allowedContentTypes[0];
  const [enabled, setEnabled] = useState(placement.isEnabled);

  const modeOptions = useMemo(
    () => displayModesForContent(contentKind),
    [contentKind],
  );

  return (
    <section className="admin-card space-y-4 p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-primary">
            {placement.label}
          </h2>
          <p className="mt-1 text-sm text-muted">
            صفحه هدف: {placement.targetPageLabel}{" "}
            <span className="font-mono text-xs" dir="ltr">
              ({placement.targetPath})
            </span>
          </p>
          {placement.selectedSummary ? (
            <p className="mt-1 text-xs text-foreground">
              انتخاب فعلی: {placement.selectedSummary}
            </p>
          ) : null}
        </div>
        <Link
          href={placement.targetPath}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex shrink-0 items-center justify-center rounded-xl border border-border px-3 py-2 text-xs font-medium text-foreground hover:bg-background"
        >
          مشاهده صفحه
        </Link>
      </div>

      {placement.sourceHint === "env" ? (
        <p
          role="status"
          className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm leading-7 text-amber-950"
        >
          این جایگاه فعلاً از تنظیمات سرور خوانده می‌شود. با ذخیره در پنل،
          مدیریت آن به پنل منتقل خواهد شد.
        </p>
      ) : null}

      {placement.warning ? (
        <p
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm leading-7 text-red-800"
        >
          {placement.warning}
        </p>
      ) : null}

      {statusMessage ? (
        <p
          role="status"
          className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm leading-7 text-emerald-900"
        >
          {statusMessage}
        </p>
      ) : null}

      {errorMessage ? (
        <p
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm leading-7 text-red-800"
        >
          {errorMessage}
        </p>
      ) : null}

      <form action={saveAction} className="space-y-4">
        <input type="hidden" name="placementKey" value={placement.key} />

        <label className="flex items-center gap-2 text-sm text-foreground">
          <input
            type="checkbox"
            name="isEnabled"
            value="true"
            checked={enabled}
            onChange={(event) => setEnabled(event.target.checked)}
            className="size-4 rounded border-border text-primary"
          />
          فعال‌سازی این جایگاه در صفحه عمومی
        </label>

        {contentKind === "FORM" ? (
          <div>
            <label
              htmlFor={`form-${placement.key}`}
              className="text-sm font-medium text-primary"
            >
              فرم منتشرشده
            </label>
            <select
              id={`form-${placement.key}`}
              name="formId"
              defaultValue={placement.formId ?? ""}
              disabled={!enabled}
              className={fieldClass(Boolean(relevantSave.fieldErrors?.formId))}
            >
              <option value="">انتخاب کنید</option>
              {forms.map((form) => (
                <option key={form.id} value={form.id}>
                  {form.title} — {form.purposeLabel} ({form.slug})
                </option>
              ))}
            </select>
            {relevantSave.fieldErrors?.formId ? (
              <p className="mt-1.5 text-sm text-red-700">
                {relevantSave.fieldErrors.formId}
              </p>
            ) : null}
            <p className="mt-1.5 text-xs leading-6 text-muted">
              فقط فرم‌های منتشرشده سازمان شما نمایش داده می‌شوند.
            </p>
          </div>
        ) : (
          <div>
            <label
              htmlFor={`booking-${placement.key}`}
              className="text-sm font-medium text-primary"
            >
              خدمت نوبت‌دهی فعال
            </label>
            <select
              id={`booking-${placement.key}`}
              name="bookingServiceId"
              defaultValue={placement.bookingServiceId ?? ""}
              disabled={!enabled}
              className={fieldClass(
                Boolean(relevantSave.fieldErrors?.bookingServiceId),
              )}
            >
              <option value="">انتخاب کنید</option>
              {bookingServices.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.title}
                  {service.branchName ? ` — ${service.branchName}` : ""} (
                  {service.slug})
                </option>
              ))}
            </select>
            {relevantSave.fieldErrors?.bookingServiceId ? (
              <p className="mt-1.5 text-sm text-red-700">
                {relevantSave.fieldErrors.bookingServiceId}
              </p>
            ) : null}
          </div>
        )}

        <div>
          <label
            htmlFor={`mode-${placement.key}`}
            className="text-sm font-medium text-primary"
          >
            حالت نمایش
          </label>
          <select
            id={`mode-${placement.key}`}
            name="displayMode"
            defaultValue={placement.displayMode}
            className={fieldClass(
              Boolean(relevantSave.fieldErrors?.displayMode),
            )}
          >
            {modeOptions.map((mode) => (
              <option key={mode} value={mode}>
                {getSiteDisplayModeLabel(mode)}
              </option>
            ))}
          </select>
        </div>

        {placement.supportsShowPoster ? (
          <label className="flex items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              name="showPoster"
              value="true"
              defaultChecked={placement.showPoster}
              className="size-4 rounded border-border text-primary"
            />
            نمایش پوستر فرم
          </label>
        ) : null}

        <div>
          <label
            htmlFor={`heading-${placement.key}`}
            className="text-sm font-medium text-primary"
          >
            عنوان بخش (اختیاری)
          </label>
          <input
            id={`heading-${placement.key}`}
            name="heading"
            type="text"
            maxLength={120}
            defaultValue={placement.heading}
            className={fieldClass(Boolean(relevantSave.fieldErrors?.heading))}
          />
        </div>

        <div>
          <label
            htmlFor={`description-${placement.key}`}
            className="text-sm font-medium text-primary"
          >
            توضیح بخش (اختیاری)
          </label>
          <textarea
            id={`description-${placement.key}`}
            name="description"
            rows={3}
            maxLength={500}
            defaultValue={placement.description}
            className={fieldClass(
              Boolean(relevantSave.fieldErrors?.description),
            )}
          />
        </div>

        {placement.supportsCtaLabel ? (
          <div>
            <label
              htmlFor={`cta-${placement.key}`}
              className="text-sm font-medium text-primary"
            >
              متن دکمه رزرو (اختیاری)
            </label>
            <input
              id={`cta-${placement.key}`}
              name="ctaLabel"
              type="text"
              maxLength={80}
              defaultValue={placement.ctaLabel}
              className={fieldClass(
                Boolean(relevantSave.fieldErrors?.ctaLabel),
              )}
            />
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2 border-t border-border pt-4">
          <button
            type="submit"
            disabled={savePending}
            className="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-primary/92 disabled:opacity-60"
          >
            {savePending ? "در حال ذخیره…" : "ذخیره جایگاه"}
          </button>
        </div>
      </form>

      <div className="flex flex-wrap gap-2">
        <form action={disableAction}>
          <input type="hidden" name="placementKey" value={placement.key} />
          <button
            type="submit"
            disabled={disablePending}
            className="rounded-xl border border-border px-4 py-2 text-sm text-foreground hover:bg-background disabled:opacity-60"
          >
            {disablePending ? "…" : "غیرفعال‌سازی"}
          </button>
        </form>
        <form action={resetAction}>
          <input type="hidden" name="placementKey" value={placement.key} />
          <button
            type="submit"
            disabled={resetPending}
            className="rounded-xl border border-amber-200 px-4 py-2 text-sm text-amber-900 hover:bg-amber-50 disabled:opacity-60"
          >
            {resetPending ? "…" : "بازنشانی به پشتیبان سرور"}
          </button>
        </form>
      </div>
    </section>
  );
}

export function SitePlacementsManager({
  forms,
  bookingServices,
  placements,
}: SitePlacementsManagerProps) {
  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-border bg-surface px-4 py-3 text-sm leading-7 text-muted">
        فقط فرم‌های منتشرشده و خدمت‌های نوبت‌دهی فعال قابل انتخاب هستند. پس از
        ذخیره، صفحات عمومی بدون نیاز به بازسازی برنامه به‌روز می‌شوند.
      </div>
      {placements.map((placement) => (
        <PlacementCard
          key={placement.key}
          placement={placement}
          forms={forms}
          bookingServices={bookingServices}
        />
      ))}
    </div>
  );
}
