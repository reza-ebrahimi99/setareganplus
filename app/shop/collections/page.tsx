import Link from "next/link";
import { StarBookShell } from "@/components/starbook/StarBookShell";
import { listPublicStoreCollections } from "@/lib/commerce/catalog/service";
import { getCurrentOrganization } from "@/lib/organizations/get-current-organization";

export const dynamic = "force-dynamic";

export default async function StarBookCollectionsPage() {
  const organization = await getCurrentOrganization();
  const collections = await listPublicStoreCollections(organization.id);

  return (
    <StarBookShell activePath="/shop/collections">
      <section className="starbook-hero">
        <span className="starbook-kicker">کالکشن</span>
        <h1>قفسه‌هایی که برات چیده شده.</h1>
      </section>
      <section className="starbook-section starbook-grid">
        {collections.map((collection) => (
          <Link
            key={collection.id}
            href={`/shop/collections/${collection.slug}`}
            className="starbook-tile"
            data-tone={collection.isFeatured ? "exam" : "new"}
          >
            <h3>{collection.title}</h3>
            <p className="mt-2 text-sm text-[var(--sb-muted)]">
              {collection.description || "ورود به این قفسه"}
            </p>
          </Link>
        ))}
      </section>
    </StarBookShell>
  );
}
