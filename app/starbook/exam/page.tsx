import { StarBookCard } from "@/components/starbook/StarBookCard";
import { StarBookEmpty } from "@/components/starbook/StarBookEmpty";
import { StarBookShell } from "@/components/starbook/StarBookShell";
import { listPublicCommerceProducts } from "@/lib/commerce/catalog/service";
import { getCurrentOrganization } from "@/lib/organizations/get-current-organization";

export const dynamic = "force-dynamic";

export default async function StarBookExamPage() {
  const organization = await getCurrentOrganization();
  const products = await listPublicCommerceProducts({
    organizationId: organization.id,
    q: "آزمون",
    limit: 80,
  });
  const fallback =
    products.length > 0
      ? products
      : await listPublicCommerceProducts({
          organizationId: organization.id,
          categorySlug: "azmoon",
          limit: 80,
        });

  return (
    <StarBookShell activePath="/browse">
      <section className="starbook-hero">
        <span className="starbook-kicker">آزمون</span>
        <h1>شب امتحان، بدون هرج‌ومرج.</h1>
      </section>
      {fallback.length === 0 ? (
        <StarBookEmpty title="قفسه آزمون خالی است" body="به‌زودی آزمون‌ها اینجا می‌آیند." />
      ) : (
        <section className="starbook-section starbook-grid">
          {fallback.map((product) => (
            <StarBookCard key={product.id} product={product} tone="sale" />
          ))}
        </section>
      )}
    </StarBookShell>
  );
}
