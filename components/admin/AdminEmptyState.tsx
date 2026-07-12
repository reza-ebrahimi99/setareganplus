type AdminEmptyStateProps = {
  title: string;
  description: string;
  action?: React.ReactNode;
};

export function AdminEmptyState({
  title,
  description,
  action,
}: AdminEmptyStateProps) {
  return (
    <div className="admin-card flex flex-col items-center px-6 py-12 text-center">
      <div
        aria-hidden="true"
        className="mb-4 flex size-14 items-center justify-center rounded-full border border-border bg-background text-primary"
      >
        <span className="text-2xl font-light">—</span>
      </div>
      <h2 className="text-lg font-semibold text-primary">{title}</h2>
      <p className="mt-3 max-w-xl text-sm leading-7 text-muted">{description}</p>
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}
