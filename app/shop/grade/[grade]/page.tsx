import { StarBookCard } from "@/components/starbook/StarBookCard";
import { StarBookEmpty } from "@/components/starbook/StarBookEmpty";
import { StarBookShell } from "@/components/starbook/StarBookShell";
import { listPublicCommerceProducts } from "@/lib/commerce/catalog/service";
import { getCurrentOrganization } from "@/lib/organizations/get-current-organization";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ grade: string }>;
};

export default async function StarBookGradePage({ params }: PageProps) {
  const { grade } = await params;
  const decoded = decodeURIComponent(grade);
  const organization = await getCurrentOrganization();
  const products = await listPublicCommerceProducts({
    organizationId: organization.id,
    gradeLabel: decoded,
    limit: 80,
  });

  return (
    <StarBookShell activePath="/shop/browse">
      <section className="starbook-hero">
        <span className="starbook-kicker">پایه</span>
        <h1>{decoded}</h1>
      </section>
      {products.length === 0 ? (
        <StarBookEmpty title="برای این پایه هنوز کتابی نیست" body="پایه دیگری را امتحان کن." />
      ) : (
        <section className="starbook-section starbook-grid">
          {products.map((product) => (
            <StarBookCard key={product.id} product={product} />
          ))}
        </section>
      )}
    </StarBookShell>
  );
}
