import { notFound } from "next/navigation";
import { StarBookCard } from "@/components/starbook/StarBookCard";
import { StarBookEmpty } from "@/components/starbook/StarBookEmpty";
import { StarBookShell } from "@/components/starbook/StarBookShell";
import {
  listPublicCommerceProducts,
  listPublicStoreCollections,
} from "@/lib/commerce/catalog/service";
import { getCurrentOrganization } from "@/lib/organizations/get-current-organization";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export default async function StarBookCollectionPage({ params }: PageProps) {
  const { slug } = await params;
  const organization = await getCurrentOrganization();
  const [collections, products] = await Promise.all([
    listPublicStoreCollections(organization.id),
    listPublicCommerceProducts({
      organizationId: organization.id,
      categorySlug: slug,
      limit: 80,
    }),
  ]);
  const collection = collections.find((item) => item.slug === slug);
  if (!collection) notFound();

  return (
    <StarBookShell activePath="/collections">
      <section className="starbook-hero">
        <span className="starbook-kicker">کالکشن</span>
        <h1>{collection.title}</h1>
        <p>{collection.description || "کتاب‌های این قفسه از همان کاتالوگ واحد استاربوک می‌آیند."}</p>
      </section>
      {products.length === 0 ? (
        <StarBookEmpty title="این قفسه هنوز خالی است" body="به‌زودی کتاب‌های این کالکشن می‌آیند." />
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
