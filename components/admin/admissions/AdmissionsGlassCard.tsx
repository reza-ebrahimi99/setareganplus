type AdmissionsGlassCardProps = {
  children: React.ReactNode;
  className?: string;
  as?: "section" | "article" | "div";
  "aria-label"?: string;
  "aria-labelledby"?: string;
};

export function AdmissionsGlassCard({
  children,
  className = "",
  as: Tag = "section",
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
}: AdmissionsGlassCardProps) {
  return (
    <Tag
      className={`admin-glass ${className}`.trim()}
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledBy}
    >
      {children}
    </Tag>
  );
}
