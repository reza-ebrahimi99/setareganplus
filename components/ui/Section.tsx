type SectionProps = {
  children: React.ReactNode;
  className?: string;
  id?: string;
  ariaLabelledby?: string;
};

export function Section({
  children,
  className,
  id,
  ariaLabelledby,
}: SectionProps) {
  return (
    <section
      id={id}
      aria-labelledby={ariaLabelledby}
      className={className ? `py-12 sm:py-16 ${className}` : "py-12 sm:py-16"}
    >
      {children}
    </section>
  );
}
