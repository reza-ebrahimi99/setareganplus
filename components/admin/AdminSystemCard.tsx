import { systemEnvironment } from "@/content/admin";

export function AdminSystemCard() {
  return (
    <div className="admin-card p-5 sm:p-6">
      <h2 className="text-base font-semibold text-primary sm:text-lg">
        {systemEnvironment.title}
      </h2>
      <dl className="mt-4 space-y-3">
        {systemEnvironment.items.map((item) => (
          <div
            key={item.label}
            className="flex items-center justify-between gap-4 rounded-lg border border-border bg-background px-4 py-2.5"
          >
            <dt className="text-sm text-muted">{item.label}</dt>
            <dd className="text-sm font-medium text-primary">{item.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
