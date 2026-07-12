type StatusBadgeTone = "default" | "development" | "enrollment";

type StatusBadgeProps = {
  children: React.ReactNode;
  tone?: StatusBadgeTone;
};

const toneStyles: Record<StatusBadgeTone, string> = {
  default: "border-border bg-background text-muted",
  development: "border-secondary/30 bg-secondary/10 text-primary",
  enrollment: "border-primary/15 bg-primary/5 text-primary",
};

export function StatusBadge({
  children,
  tone = "default",
}: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex w-fit items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${toneStyles[tone]}`}
    >
      {children}
    </span>
  );
}
