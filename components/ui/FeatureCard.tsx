type FeatureCardProps = {
  title: string;
  description: string;
  icon?: React.ReactNode;
  badge?: string;
};

export function FeatureCard({
  title,
  description,
  icon,
  badge,
}: FeatureCardProps) {
  return (
    <article className="premium-card h-full p-6">
      {icon ? (
        <div className="mb-4 flex size-11 items-center justify-center rounded-xl border border-border bg-background text-primary">
          {icon}
        </div>
      ) : null}
      {badge ? (
        <p className="mb-3 text-xs font-medium text-secondary">{badge}</p>
      ) : null}
      <h3 className="text-base font-semibold text-primary">{title}</h3>
      <p className="mt-2 text-sm leading-7 text-muted">{description}</p>
    </article>
  );
}
