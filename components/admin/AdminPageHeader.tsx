type AdminPageHeaderProps = {
  title: string;
  description?: string;
  id?: string;
};

export function AdminPageHeader({
  title,
  description,
  id = "admin-page-heading",
}: AdminPageHeaderProps) {
  return (
    <header className="mb-6 border-b border-border pb-5">
      <h1 id={id} className="text-2xl font-bold text-primary sm:text-3xl">
        {title}
      </h1>
      {description ? (
        <p className="mt-2 max-w-3xl text-sm leading-7 text-muted sm:text-base">
          {description}
        </p>
      ) : null}
    </header>
  );
}
