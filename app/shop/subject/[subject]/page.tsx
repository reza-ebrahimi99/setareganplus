import { StarBookCard } from "@/components/starbook/StarBookCard";
import { StarBookEmpty } from "@/components/starbook/StarBookEmpty";
import { StarBookShell } from "@/components/starbook/StarBookShell";
import { listPublicCommerceProducts } from "@/lib/commerce/catalog/service";
import { getCurrentOrganization } from "@/lib/organizations/get-current-organization";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ subject: string }>;
};

export default async function StarBookSubjectPage({ params }: PageProps) {
  const { subject } = await params;
  const decoded = decodeURIComponent(subject);
  const organization = await getCurrentOrganization();
  const products = await listPublicCommerceProducts({
    organizationId: organization.id,
    subject: decoded,
    limit: 80,
  });

  return (
    <StarBookShell activePath="/shop/browse">
      <section className="starbook-hero">
        <span className="starbook-kicker">درس</span>
        <h1>{decoded}</h1>
      </section>
      {products.length === 0 ? (
        <StarBookEmpty title="این درس هنوز قفسه ندارد" body="از جستجو وارد شو." />
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
