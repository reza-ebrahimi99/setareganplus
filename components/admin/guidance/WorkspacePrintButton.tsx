"use client";

export function WorkspacePrintButton() {
  return (
    <button
      type="button"
      className="counselor-report__print"
      onClick={() => window.print()}
    >
      ذخیره PDF / چاپ
    </button>
  );
}
