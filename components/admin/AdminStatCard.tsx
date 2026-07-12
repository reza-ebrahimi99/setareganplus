type AdminStatCardProps = {
  label: string;
};

export function AdminStatCard({ label }: AdminStatCardProps) {
  return (
    <article className="admin-card p-5">
      <p className="text-sm font-medium text-muted">{label}</p>
      <p
        className="mt-3 text-3xl font-bold tracking-tight text-primary"
        aria-label={`${label}: داده‌ای موجود نیست`}
      >
        —
      </p>
      <p className="mt-2 text-xs text-muted">داده پس از اتصال سامانه نمایش داده می‌شود</p>
    </article>
  );
}
