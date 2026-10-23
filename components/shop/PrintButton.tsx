"use client";
export function PrintButton({ label = "چاپ / ذخیره PDF", className = "btn-ghost" }: { label?: string; className?: string }) {
  return <button type="button" onClick={() => window.print()} className={className}>{label}</button>;
}
