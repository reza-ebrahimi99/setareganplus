type LeadStatusBadgeProps = {
  label: string;
  tone?: "neutral" | "info" | "success" | "danger";
};

const toneStyles = {
  neutral: "border-border bg-background text-muted",
  info: "border-primary/15 bg-primary/5 text-primary",
  success: "border-success/20 bg-success/10 text-success",
  danger: "border-danger/20 bg-danger/10 text-danger",
} as const;

export function LeadStatusBadge({
  label,
  tone = "neutral",
}: LeadStatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${toneStyles[tone]}`}
    >
      {label}
    </span>
  );
}
