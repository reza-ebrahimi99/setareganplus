import type { SelectHTMLAttributes } from "react";

type LeadOwnerSelectProps = Omit<
  SelectHTMLAttributes<HTMLSelectElement>,
  "children"
> & {
  owners: Array<{ id: string; name: string }>;
  unassignedLabel?: string;
};

export function LeadOwnerSelect({
  owners,
  unassignedLabel = "بدون مسئول",
  className = "",
  ...props
}: LeadOwnerSelectProps) {
  return (
    <select
      {...props}
      className={`rounded-lg border border-border bg-white px-3 py-2 ${className}`}
    >
      <option value="">{unassignedLabel}</option>
      {owners.map((owner) => (
        <option key={owner.id} value={owner.id}>
          {owner.name}
        </option>
      ))}
    </select>
  );
}
