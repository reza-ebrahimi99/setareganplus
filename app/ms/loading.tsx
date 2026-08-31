export default function MajorOfficeLoading() {
  return (
    <div className="office-loading" dir="rtl" aria-busy="true" aria-live="polite">
      <p>دفتر در حال آماده شدن است…</p>
      <span className="office-loading__bar" />
    </div>
  );
}
