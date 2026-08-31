"use client";

export function AssessmentPrintButton() {
  return (
    <button
      type="button"
      className="office-report__print office-assess-print-hide"
      onClick={() => window.print()}
    >
      چاپ گزارش برای خانواده
    </button>
  );
}
