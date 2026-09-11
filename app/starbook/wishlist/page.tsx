import { StarBookWishlist } from "@/components/starbook/StarBookWishlist";
import { StarBookShell } from "@/components/starbook/StarBookShell";
import { listPublicCommerceProducts } from "@/lib/commerce/catalog/service";
import { getCurrentOrganization } from "@/lib/organizations/get-current-organization";

export const dynamic = "force-dynamic";

export default async function StarBookWishlistPage() {
  const organization = await getCurrentOrganization();
  const products = await listPublicCommerceProducts({
    organizationId: organization.id,
    limit: 80,
  });

  return (
    <StarBookShell activePath="/account">
      <section className="starbook-hero">
        <span className="starbook-kicker">علاقه‌مندی</span>
        <h1>کتاب‌هایی که نگه داشتی.</h1>
      </section>
      <StarBookWishlist catalog={products} />
    </StarBookShell>
  );
}
