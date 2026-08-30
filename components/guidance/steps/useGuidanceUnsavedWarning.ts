"use client";

import { useEffect } from "react";

/**
 * Warns before closing/reloading the tab while a step form has unsaved edits.
 * Client-side UX only — server-side validation remains the source of truth.
 */
export function useGuidanceUnsavedWarning(isDirty: boolean) {
  useEffect(() => {
    if (!isDirty) return;
    function handler(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = "";
    }
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);
}
