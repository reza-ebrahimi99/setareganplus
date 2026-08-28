"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { markCommerceOpsNotificationsReadAction } from "@/app/admin/(dashboard)/commerce/actions";
import type { OrderOpsNotificationView } from "@/components/admin/commerce/order-ops-types";
import { toPersianDigits } from "@/lib/persian";

export function OrderOpsNotifications({
  unreadCount,
  items,
}: {
  unreadCount: number;
  items: readonly OrderOpsNotificationView[];
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next && unreadCount > 0) {
      startTransition(() => {
        void markCommerceOpsNotificationsReadAction();
      });
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={toggle}
        className="relative inline-flex min-h-11 items-center rounded-xl border border-border bg-surface px-3 text-sm"
        aria-expanded={open}
      >
        اعلان‌ها
        {unreadCount > 0 ? (
          <span className="ms-2 inline-flex min-w-5 items-center justify-center rounded-full bg-rose-600 px-1.5 text-[11px] font-bold text-white">
            {toPersianDigits(unreadCount)}
          </span>
        ) : null}
      </button>
      {open ? (
        <div className="absolute end-0 z-40 mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-border bg-surface shadow-xl">
          <div className="border-b border-border px-3 py-2 text-xs text-muted">
            {pending ? "در حال به‌روزرسانی…" : "اعلان‌های داخلی عملیات جزوه"}
          </div>
          {items.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-muted">اعلانی نیست.</p>
          ) : (
            <ul className="max-h-80 overflow-y-auto">
              {items.map((item) => (
                <li key={item.id} className="border-b border-border last:border-b-0">
                  <Link
                    href={item.entityId ? `/admin/commerce/orders?orderId=${item.entityId}` : "/admin/commerce/orders"}
                    className={`block px-3 py-2.5 hover:bg-background ${item.read ? "" : "bg-primary/[0.04]"}`}
                    onClick={() => setOpen(false)}
                  >
                    <p className="text-sm font-medium">{item.title}</p>
                    {item.body ? <p className="mt-0.5 text-xs text-muted">{item.body}</p> : null}
                    <p className="mt-1 text-[11px] text-muted">{item.createdAtLabel}</p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
