/** Structured data. `<` is escaped so text from the DB can never close the script tag. */
export function JsonLd({ data }: { data: unknown }) {
  if (!data) return null;
  const list = (Array.isArray(data) ? data : [data]).filter(Boolean);
  return (
    <>
      {list.map((d, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(d).replace(/</g, "\\u003c") }} />
      ))}
    </>
  );
}
