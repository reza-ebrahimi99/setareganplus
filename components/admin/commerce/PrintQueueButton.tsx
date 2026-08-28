"use client";

export function PrintQueueButton({ label = "چاپ" }: { label?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="min-h-11 rounded-xl border border-border bg-surface px-4 text-sm print:hidden"
    >
      {label}
    </button>
  );
}
