"use client";

import { useEffect, useId, useRef } from "react";

type AdminDrawerProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string | null;
  children: React.ReactNode;
  footer?: React.ReactNode;
  wide?: boolean;
};

export function AdminDrawer({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  wide = false,
}: AdminDrawerProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    const focusTimer = window.setTimeout(() => {
      panelRef.current
        ?.querySelector<HTMLElement>("[data-admin-drawer-close]")
        ?.focus();
    }, 40);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
      window.clearTimeout(focusTimer);
    };
  }, [open, onClose]);

  return (
    <div
      className={`fixed inset-0 z-[70] ${open ? "pointer-events-auto" : "pointer-events-none"}`}
      aria-hidden={!open}
    >
      <button
        type="button"
        tabIndex={open ? 0 : -1}
        aria-label="بستن جزئیات"
        className={`absolute inset-0 bg-primary/35 backdrop-blur-[2px] transition-opacity duration-300 ${
          open ? "opacity-100" : "opacity-0"
        }`}
        onClick={onClose}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`absolute inset-y-0 end-0 flex w-full flex-col border-s border-border bg-surface shadow-[12px_0_40px_rgb(15_23_42_/_0.16)] transition-transform duration-300 ease-out ${
          wide ? "sm:max-w-[520px]" : "sm:max-w-[440px]"
        } ${open ? "translate-x-0" : "translate-x-full rtl:-translate-x-full"} motion-reduce:transition-none`}
      >
        <header className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div className="min-w-0">
            <h2 id={titleId} className="text-lg font-bold text-primary">
              {title}
            </h2>
            {subtitle ? (
              <p className="mt-1 text-sm text-muted">{subtitle}</p>
            ) : null}
          </div>
          <button
            type="button"
            data-admin-drawer-close
            onClick={onClose}
            className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border text-muted hover:bg-background"
            aria-label="بستن"
          >
            <span className="text-lg leading-none">×</span>
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer ? (
          <footer className="border-t border-border bg-background/80 px-5 py-4">
            {footer}
          </footer>
        ) : null}
      </div>
    </div>
  );
}
