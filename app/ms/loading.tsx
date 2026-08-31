export default function MajorOfficeLoading() {
  return (
    <div className="office-loading" dir="rtl" aria-busy="true" aria-live="polite">
      <p>در حال بارگذاری دفتر…</p>
      <span className="office-loading__bar" />
    </div>
  );
}
