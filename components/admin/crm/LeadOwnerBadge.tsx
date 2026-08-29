type LeadOwnerBadgeProps = {
  ownerName: string | null;
  compact?: boolean;
};

export function LeadOwnerBadge({
  ownerName,
  compact = false,
}: LeadOwnerBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 font-medium ${
        compact ? "text-[11px]" : "text-xs"
      } ${
        ownerName
          ? "border-sky-200 bg-sky-50 text-sky-800"
          : "border-slate-200 bg-slate-50 text-slate-600"
      }`}
    >
      {ownerName ?? "بدون مسئول"}
    </span>
  );
}
