import { notFound } from "next/navigation";
import { StarBookCard } from "@/components/starbook/StarBookCard";
import { StarBookCountdown } from "@/components/starbook/StarBookCountdown";
import { StarBookEmpty } from "@/components/starbook/StarBookEmpty";
import { StarBookFrame } from "@/components/starbook/StarBookFrame";
import { StarBookHeroScene } from "@/components/starbook/StarBookHeroScene";
import { StarBookReveal, StarBookStagger, StarBookStaggerItem } from "@/components/starbook/StarBookMotion";
import { listPublicCommerceProducts } from "@/lib/commerce/catalog/service";
import { getStarBookCampaign } from "@/lib/commerce/starbook/campaigns";
import { partitionStarBookShelves } from "@/lib/commerce/starbook/merchandising";
import { getCurrentOrganization } from "@/lib/organizations/get-current-organization";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export default async function StarBookCampaignPage({ params }: PageProps) {
  const { slug } = await params;
  const campaign = getStarBookCampaign(slug);
  if (!campaign) notFound();

  const organization = await getCurrentOrganization();
  const products = await listPublicCommerceProducts({
    organizationId: organization.id,
    limit: 80,
  });
  const shelves = partitionStarBookShelves(products);
  const picked =
    campaign.tone === "flash"
      ? shelves.flash
      : campaign.tone === "new"
        ? shelves.newest
        : campaign.tone === "bundle"
          ? shelves.featured.length
            ? shelves.featured
            : shelves.trending
          : shelves.trending;

  return (
    <StarBookFrame activePath="/campaigns/flash-konkur" products={products}>
      <section className="starbook-hero starbook-hero-immersive">
        <StarBookHeroScene />
        <div className="relative z-[1]">
          <span className="starbook-kicker">{campaign.eyebrow}</span>
          <h1 className="!max-w-[18ch]">{campaign.title}</h1>
          <p>{campaign.subtitle}</p>
          {campaign.tone === "flash" ? (
            <div className="mt-4">
              <StarBookCountdown />
            </div>
          ) : null}
        </div>
      </section>
      {picked.length === 0 ? (
        <StarBookEmpty title="این کمپین فعلاً آرام است" body="به‌محض رسیدن موجودی، اینجا روشن می‌شود." />
      ) : (
        <StarBookReveal>
          <section className="starbook-section">
            <StarBookStagger className="starbook-grid">
              {picked.map((product) => (
                <StarBookStaggerItem key={product.id}>
                  <StarBookCard
                    product={product}
                    tone={campaign.tone === "flash" ? "sale" : "hero"}
                  />
                </StarBookStaggerItem>
              ))}
            </StarBookStagger>
          </section>
        </StarBookReveal>
      )}
    </StarBookFrame>
  );
}
