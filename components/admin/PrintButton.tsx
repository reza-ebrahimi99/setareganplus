"use client";

export function PrintButton() {
  return (
    <button type="button" className="btn-navy no-print px-4 py-2 text-sm" onClick={() => window.print()}>
      چاپ / PDF
    </button>
  );
}
