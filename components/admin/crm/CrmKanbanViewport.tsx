"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";

export function CrmKanbanViewport({ children }: { children: ReactNode }) {
  const viewportRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    // The viewport uses LTR scroll coordinates for consistent Chromium
    // behavior. The board itself remains RTL. Run once after layout so the
    // first (rightmost) CRM column is visible without fighting user scrolling.
    const frame = window.requestAnimationFrame(() => {
      viewport.scrollLeft = viewport.scrollWidth;
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  return (
    <div
      ref={viewportRef}
      data-crm-kanban-viewport
      dir="ltr"
      className="hidden w-full min-w-0 overflow-x-auto overscroll-x-contain pb-4 lg:block"
    >
      <div
        data-crm-kanban-board
        dir="rtl"
        className="inline-flex flex-nowrap gap-3 [width:max-content]"
      >
        {children}
      </div>
    </div>
  );
}
