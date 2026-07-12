type ContentCardVariant = "default" | "notice";

type ContentCardProps = {
  heading: string;
  body: string;
  variant?: ContentCardVariant;
};

const variantStyles: Record<ContentCardVariant, string> = {
  default: "premium-card",
  notice: "rounded-xl border border-dashed border-border bg-background p-6 shadow-sm",
};

export function ContentCard({
  heading,
  body,
  variant = "default",
}: ContentCardProps) {
  const baseClassName =
    variant === "default" ? "premium-card p-6" : `${variantStyles.notice}`;

  return (
    <article className={baseClassName}>
      <h2 className="text-xl font-semibold text-primary">{heading}</h2>
      <p className="mt-3 text-base leading-8 text-muted">{body}</p>
    </article>
  );
}
