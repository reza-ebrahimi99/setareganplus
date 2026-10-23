"use client";
export function SelectAll() {
  return (
    <input
      type="checkbox"
      aria-label="انتخاب همه"
      className="size-4 accent-navy"
      onChange={(e) => {
        const form = e.currentTarget.form;
        form?.querySelectorAll<HTMLInputElement>('input[name="ids"]').forEach((i) => (i.checked = e.currentTarget.checked));
        form?.dispatchEvent(new Event("change", { bubbles: true }));
      }}
    />
  );
}

/** Shows how many rows are ticked, so the bulk bar is not a mystery. */
export function SelectedCount() {
  return (
    <span
      className="text-sm text-muted"
      ref={(el) => {
        if (!el) return;
        const form = el.closest("form");
        const upd = () => {
          const n = form?.querySelectorAll('input[name="ids"]:checked').length ?? 0;
          el.textContent = n ? `${n.toLocaleString("fa-IR")} سفارش انتخاب شده` : "سفارشی انتخاب نشده";
        };
        form?.addEventListener("change", upd);
        upd();
      }}
    />
  );
}
