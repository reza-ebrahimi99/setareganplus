"use client";

import { useId, useState } from "react";
import { PortalIcon } from "@/components/portal/icons";

/**
 * Notification Center architecture (Phase 1).
 * Bell + empty panel only — no fake notifications.
 * Future systems mount real items into this shell.
 */
export function PortalNotificationBell() {
  const [open, setOpen] = useState(false);
  const panelId = useId();

  return (
    <div className="portal-notify">
      <button
        type="button"
        className="portal-topbar__icon-btn"
        aria-label="اعلان‌ها"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
      >
        <PortalIcon name="bell" className="size-5" />
      </button>
      {open ? (
        <div
          id={panelId}
          className="portal-notify__panel"
          role="dialog"
          aria-label="مرکز اعلان‌ها"
        >
          <p className="portal-notify__title">اعلان‌ها</p>
          <p className="portal-notify__empty">
            هنوز اعلانی ندارید. به‌محض رسیدن پیام جدید، اینجا نمایش داده می‌شود.
          </p>
          <button
            type="button"
            className="portal-notify__close"
            onClick={() => setOpen(false)}
          >
            بستن
          </button>
        </div>
      ) : null}
    </div>
  );
}
