"use client";

import { useRef } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import {
  archivePageAction,
  duplicatePageAction,
  restoreArchivedPageAction,
  restoreDeletedPageAction,
  softDeletePageAction,
} from "@/app/admin/(dashboard)/website/pages/actions";
import type { AdminWebsitePageListView } from "@/lib/website/page-builder/pages-admin";
import type { PageStatus } from "@/lib/website/page-builder/constants";
import { getPublicPagePath } from "@/lib/website/page-builder/public-path";

type LifecycleState = "live" | "archived" | "deleted";

type Props = {
  pageId: string;
  slug: string;
  status: PageStatus;
  lifecycleState: LifecycleState;
  view?: AdminWebsitePageListView;
  layout?: "list" | "editor";
  showNavigation?: boolean;
};

function LifecycleFormButton({
  label,
  pendingLabel,
  confirmMessage,
  variant = "default",
  className,
}: {
  label: string;
  pendingLabel: string;
  confirmMessage: string;
  variant?: "default" | "danger" | "primary";
  className?: string;
}) {
  const { pending } = useFormStatus();
  const submittedRef = useRef(false);

  const base =
    variant === "danger"
      ? "rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
      : variant === "primary"
        ? "rounded-xl bg-primary px-3 py-2 text-sm font-medium text-white"
        : "rounded-xl border border-border bg-white px-3 py-2 text-sm";

  return (
    <button
      type="submit"
      disabled={pending || submittedRef.current}
      className={`${base} disabled:opacity-60 ${className ?? ""}`}
      onClick={(event) => {
        if (submittedRef.current || pending) {
          event.preventDefault();
          return;
        }
        if (!window.confirm(confirmMessage)) {
          event.preventDefault();
          return;
        }
        submittedRef.current = true;
      }}
    >
      {pending || submittedRef.current ? pendingLabel : label}
    </button>
  );
}

function HiddenFields({
  pageId,
  view,
}: {
  pageId: string;
  view: AdminWebsitePageListView;
}) {
  return (
    <>
      <input type="hidden" name="pageId" value={pageId} />
      <input type="hidden" name="view" value={view} />
    </>
  );
}

export function PageLifecycleActions({
  pageId,
  slug,
  status,
  lifecycleState,
  view = "active",
  layout = "list",
  showNavigation = true,
}: Props) {
  const publicPath = getPublicPagePath(slug);
  const stackClass =
    layout === "editor"
      ? "flex flex-wrap gap-2"
      : "flex flex-wrap items-center gap-2";

  if (lifecycleState === "deleted") {
    return (
      <div className={stackClass}>
        <form action={restoreDeletedPageAction}>
          <HiddenFields pageId={pageId} view={view} />
          <LifecycleFormButton
            label="بازیابی"
            pendingLabel="در حال بازیابی…"
            confirmMessage="این صفحه به حالت پیش‌نویس بازیابی می‌شود. ادامه می‌دهید؟"
            variant="primary"
          />
        </form>
      </div>
    );
  }

  return (
    <div className={stackClass}>
      {showNavigation && status === "PUBLISHED" ? (
        <Link
          href={publicPath}
          target="_blank"
          className="rounded-xl border border-border bg-white px-3 py-2 text-sm"
        >
          مشاهده
        </Link>
      ) : null}

      {showNavigation ? (
        <Link
          href={`/admin/website/pages/${pageId}`}
          className={
            layout === "list"
              ? "rounded-xl bg-primary px-3 py-2 text-sm font-medium text-white"
              : "hidden"
          }
        >
          ویرایش
        </Link>
      ) : null}

      {showNavigation ? (
        <Link
          href={`/admin/website/pages/${pageId}/preview`}
          className="rounded-xl border border-border bg-white px-3 py-2 text-sm"
        >
          پیش‌نمایش
        </Link>
      ) : null}

      <form action={duplicatePageAction}>
        <HiddenFields pageId={pageId} view={view} />
        <LifecycleFormButton
          label="تکثیر"
          pendingLabel="در حال تکثیر…"
          confirmMessage="یک نسخه پیش‌نویس کامل از این صفحه ساخته شود؟"
        />
      </form>

      {lifecycleState === "archived" ? (
        <form action={restoreArchivedPageAction}>
          <HiddenFields pageId={pageId} view={view} />
          <LifecycleFormButton
            label="بازیابی به پیش‌نویس"
            pendingLabel="در حال بازیابی…"
            confirmMessage="این صفحه به حالت پیش‌نویس بازگردانده می‌شود و برای نمایش عمومی باید دوباره منتشر شود."
            variant="primary"
          />
        </form>
      ) : (
        <form action={archivePageAction}>
          <HiddenFields pageId={pageId} view={view} />
          <LifecycleFormButton
            label="بایگانی"
            pendingLabel="در حال بایگانی…"
            confirmMessage="این صفحه بایگانی می‌شود و دیگر در سایت عمومی نمایش داده نخواهد شد. ادامه می‌دهید؟"
          />
        </form>
      )}

      <form action={softDeletePageAction}>
        <HiddenFields pageId={pageId} view={view} />
        <LifecycleFormButton
          label="حذف"
          pendingLabel="در حال حذف…"
          confirmMessage="این صفحه به سطل حذف‌شده‌ها منتقل می‌شود. محتوای آن حفظ خواهد شد. ادامه می‌دهید؟"
          variant="danger"
        />
      </form>
    </div>
  );
}
