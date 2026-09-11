import { StarBookCart } from "@/components/starbook/StarBookCart";
import { StarBookShell } from "@/components/starbook/StarBookShell";
import { listPublicCommerceProducts } from "@/lib/commerce/catalog/service";
import { getCurrentOrganization } from "@/lib/organizations/get-current-organization";

export const dynamic = "force-dynamic";

export default async function StarBookCartPage() {
  let catalog: Awaited<ReturnType<typeof listPublicCommerceProducts>> = [];
  try {
    const organization = await getCurrentOrganization();
    catalog = await listPublicCommerceProducts({
      organizationId: organization.id,
      limit: 40,
    });
  } catch {
    catalog = [];
  }

  return (
    <StarBookShell activePath="/shop/cart">
      <section className="starbook-hero">
        <span className="starbook-kicker">سبد</span>
        <h1>سبدت، صحنه تو.</h1>
      </section>
      <StarBookCart catalog={catalog} />
    </StarBookShell>
  );
}
