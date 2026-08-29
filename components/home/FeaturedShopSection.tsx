import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { getCurrentOrganization } from "@/lib/organizations/get-current-organization";
import { listPublicCommerceProducts } from "@/lib/commerce/catalog/service";
import { ShopProductCard } from "@/components/shop/ShopProductCard";

const headingId = "featured-shop-heading";

export async function FeaturedShopSection() {
  let organization;
  try {
    organization = await getCurrentOrganization();
  } catch {
    return null;
  }

  const products = await listPublicCommerceProducts({
    organizationId: organization.id,
    limit: 6,
  });

  if (products.length === 0) return null;

  return (
    <Section
      className="border-y border-border/60 bg-gradient-to-b from-background via-surface to-background"
      ariaLabelledby={headingId}
    >
      <Container>
        <SectionHeader
          eyebrow="فروشگاه ستارگان"
          heading="فروشگاه محصولات آموزشی ستارگان"
          description="منتخبی از جزوه‌ها و محصولات آموزشی فعال که همین حالا امکان مشاهده و خرید آنلاین دارند."
          headingId={headingId}
          action={
            <Button href="/shop" variant="outline">
              مشاهده همه محصولات
            </Button>
          }
        />

        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 xl:gap-6">
          {products.map((product, index) => (
            <ShopProductCard
              key={product.id}
              product={product}
              priority={index < 2}
            />
          ))}
        </div>

        <div className="mt-8 flex justify-center lg:hidden">
          <Button href="/shop" variant="outline">
            مشاهده همه محصولات
          </Button>
        </div>
      </Container>
    </Section>
  );
}
