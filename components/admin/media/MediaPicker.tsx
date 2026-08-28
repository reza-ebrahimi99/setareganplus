"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { MediaLibraryActionState } from "@/app/admin/(dashboard)/website/media/actions";
import { MediaLibraryUploader } from "@/components/admin/website/MediaLibraryUploader";
import { MediaPickerGrid } from "@/components/admin/media/MediaPickerGrid";
import { MediaPickerPagination } from "@/components/admin/media/MediaPickerPagination";
import { MediaPickerToolbar } from "@/components/admin/media/MediaPickerToolbar";
import type {
  MediaPickerItem,
  MediaPickerMode,
} from "@/components/admin/media/media-picker-types";
import { useMediaPickerQuery } from "@/components/admin/media/useMediaPickerQuery";
import { useMediaPickerSelection } from "@/components/admin/media/useMediaPickerSelection";

export type MediaPickerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode?: MediaPickerMode;
  selectedIds?: string[];
  excludeIds?: string[];
  maxSelection?: number;
  initialItems?: MediaPickerItem[];
  title?: string;
  confirmLabel?: string;
  allowUpload?: boolean;
  onConfirm: (items: MediaPickerItem[]) => void;
  onCancel?: () => void;
};

type TabId = "browse" | "upload";

export function MediaPicker({
  open,
  onOpenChange,
  mode = "single",
  selectedIds,
  excludeIds,
  maxSelection,
  initialItems,
  title = "انتخاب از کتابخانه رسانه",
  confirmLabel = "تأیید انتخاب",
  allowUpload = true,
  onConfirm,
  onCancel,
}: MediaPickerProps) {
  const titleId = useId();
  const searchRef = useRef<HTMLInputElement>(null);
  const triggerRestoreRef = useRef<HTMLElement | null>(null);
  const [tab, setTab] = useState<TabId>("browse");

  const query = useMediaPickerQuery({
    enabled: open,
    initialSort: "newest",
  });

  const selection = useMediaPickerSelection({
    mode,
    selectedIds,
    excludeIds,
    maxSelection,
    initialItems,
    open,
  });

  useEffect(() => {
    if (!open || query.items.length === 0) return;
    selection.rememberMany(query.items);
    // Only sync item cache when the visible page changes
    // eslint-disable-next-line react-hooks/exhaustive-deps -- rememberMany is stable; avoid selection identity churn
  }, [open, query.items]);

  useEffect(() => {
    if (!open) return;

    triggerRestoreRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusTimer = window.setTimeout(() => {
      searchRef.current?.focus();
    }, 0);

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        setTab("browse");
        onCancel?.();
        onOpenChange(false);
      }
    }
    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.clearTimeout(focusTimer);
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
      triggerRestoreRef.current?.focus();
    };
  }, [open, onCancel, onOpenChange]);

  function close() {
    setTab("browse");
    onCancel?.();
    onOpenChange(false);
  }

  function confirm() {
    if (selection.selectedCount === 0) return;
    onConfirm(selection.selectedItems);
    setTab("browse");
    onOpenChange(false);
  }

  function handleUploaded(state: MediaLibraryActionState) {
    if (!state.uploadedCount || state.uploadedCount < 1) return;
    setTab("browse");
    query.refreshNewest();
  }

  if (!open) return null;

  const selectionHint =
    mode === "single"
      ? selection.selectedCount > 0
        ? "۱ تصویر انتخاب شده"
        : "هیچ تصویری انتخاب نشده"
      : Number.isFinite(selection.maxSelection)
        ? `${selection.selectedCount} از ${selection.maxSelection} انتخاب شده`
        : `${selection.selectedCount} تصویر انتخاب شده`;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-stretch justify-center bg-slate-950/55 p-0 sm:items-center sm:p-4"
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
        className="flex h-[100dvh] w-full max-w-4xl flex-col overflow-hidden bg-white shadow-2xl sm:h-auto sm:max-h-[90vh] sm:rounded-2xl sm:border sm:border-border"
      >
        <header className="shrink-0 border-b border-border px-4 py-3 sm:px-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2
                id={titleId}
                className="text-base font-bold text-primary sm:text-lg"
              >
                {title}
              </h2>
              <p
                className="mt-1 text-xs leading-6 text-muted"
                aria-live="polite"
              >
                {selectionHint}
                {query.result.total > 0
                  ? ` · ${query.result.total} تصویر در کتابخانه`
                  : null}
              </p>
            </div>
            <button
              type="button"
              onClick={close}
              className="min-h-11 shrink-0 rounded-xl border border-border px-3 text-sm"
            >
              بستن
            </button>
          </div>

          {allowUpload ? (
            <div className="mt-3 flex gap-2">
              <TabButton
                active={tab === "browse"}
                onClick={() => setTab("browse")}
              >
                انتخاب
              </TabButton>
              <TabButton
                active={tab === "upload"}
                onClick={() => setTab("upload")}
              >
                بارگذاری
              </TabButton>
            </div>
          ) : null}
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">
          {tab === "browse" ? (
            <div className="space-y-4">
              <MediaPickerToolbar
                q={query.q}
                category={query.category}
                sort={query.sort}
                categories={query.categories}
                disabled={query.pending}
                searchInputRef={searchRef}
                onQueryChange={query.setSearchQuery}
                onCategoryChange={query.setCategoryFilter}
                onSortChange={query.setSortOption}
              />

              {selection.limitMessage ? (
                <p role="status" className="text-sm text-amber-800">
                  {selection.limitMessage}
                </p>
              ) : null}

              <MediaPickerGrid
                items={query.items}
                pending={query.pending}
                error={query.error}
                isSelected={selection.isSelected}
                isExcluded={selection.isExcluded}
                onToggle={selection.toggle}
              />

              <MediaPickerPagination
                page={query.page}
                totalPages={query.result.totalPages}
                total={query.result.total}
                pending={query.pending}
                onPageChange={query.goToPage}
              />
            </div>
          ) : (
            <MediaLibraryUploader compact onUploaded={handleUploaded} />
          )}
        </div>

        <footer className="sticky bottom-0 shrink-0 border-t border-border bg-white px-4 py-3 sm:px-5">
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={close}
              className="min-h-11 rounded-xl border border-border bg-white px-4 py-2.5 text-sm"
            >
              انصراف
            </button>
            <button
              type="button"
              disabled={selection.selectedCount === 0}
              onClick={confirm}
              className="min-h-11 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60"
            >
              {confirmLabel}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`min-h-11 flex-1 rounded-xl px-3 text-sm font-medium sm:flex-none sm:px-4 ${
        active
          ? "bg-primary text-white"
          : "border border-border bg-white text-primary"
      }`}
    >
      {children}
    </button>
  );
}
