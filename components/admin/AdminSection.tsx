type AdminSectionProps = {
  title: string;
  description?: string;
  headingId: string;
  children: React.ReactNode;
  className?: string;
};

export function AdminSection({
  title,
  description,
  headingId,
  children,
  className = "",
}: AdminSectionProps) {
  return (
    <section aria-labelledby={headingId} className={className}>
      <div className="mb-4">
        <h2 id={headingId} className="text-base font-semibold text-primary sm:text-lg">
          {title}
        </h2>
        {description ? (
          <p className="mt-1 text-sm leading-7 text-muted">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}
