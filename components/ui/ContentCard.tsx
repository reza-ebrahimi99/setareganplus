type ContentCardVariant = "default" | "notice";

type ContentCardProps = {
  heading: string;
  body: string;
  variant?: ContentCardVariant;
};

const variantStyles: Record<ContentCardVariant, string> = {
  default: "border-border bg-surface",
  notice: "border-dashed border-border bg-background",
};

export function ContentCard({
  heading,
  body,
  variant = "default",
}: ContentCardProps) {
  return (
    <article
      className={`rounded-xl border p-6 shadow-sm ${variantStyles[variant]}`}
    >
      <h2 className="text-xl font-semibold text-primary">{heading}</h2>
      <p className="mt-3 text-base leading-8 text-muted">{body}</p>
    </article>
  );
}
