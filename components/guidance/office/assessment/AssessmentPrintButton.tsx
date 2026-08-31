"use client";

export function AssessmentPrintButton() {
  return (
    <button
      type="button"
      className="chamber-quiet office-assess-print-hide"
      onClick={() => window.print()}
    >
      چاپ گزارش برای خانواده
    </button>
  );
}
