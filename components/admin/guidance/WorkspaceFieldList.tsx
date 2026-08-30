import type { WorkspaceFieldRow } from "@/lib/guidance/workspace";

export function WorkspaceFieldList({
  fields,
}: {
  fields: readonly WorkspaceFieldRow[];
}) {
  if (fields.length === 0) {
    return <p className="counselor-workspace__muted">داده‌ای برای نمایش نیست.</p>;
  }

  return (
    <dl className="counselor-workspace__fields">
      {fields.map((field, index) => (
        <div key={`${index}:${field.label}`}>
          <dt>{field.label}</dt>
          <dd>{field.value}</dd>
        </div>
      ))}
    </dl>
  );
}
