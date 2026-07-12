type PageHeadingProps = {
  title: string;
  subtitle?: string;
  id?: string;
};

export function PageHeading({ title, subtitle, id = "page-heading" }: PageHeadingProps) {
  return (
    <header className="mb-10 border-b border-border pb-8">
      <h1
        id={id}
        className="text-3xl font-bold tracking-tight text-primary sm:text-4xl"
      >
        {title}
      </h1>
      {subtitle ? (
        <p className="mt-3 max-w-3xl text-lg leading-8 text-muted">{subtitle}</p>
      ) : null}
    </header>
  );
}
