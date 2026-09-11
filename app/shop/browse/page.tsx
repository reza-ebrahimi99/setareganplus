import { StarBookCard } from "@/components/starbook/StarBookCard";
import { StarBookEmpty } from "@/components/starbook/StarBookEmpty";
import { StarBookFilterPanel } from "@/components/starbook/StarBookFilterPanel";
import { StarBookFrame } from "@/components/starbook/StarBookFrame";
import { StarBookHeroScene } from "@/components/starbook/StarBookHeroScene";
import { StarBookReveal } from "@/components/starbook/StarBookMotion";
import { StarBookSearch } from "@/components/starbook/StarBookSearch";
import {
  listPublicCommerceFilters,
  listPublicCommerceProducts,
  listPublicStoreCollections,
} from "@/lib/commerce/catalog/service";
import { getCurrentOrganization } from "@/lib/organizations/get-current-organization";
import { toPersianDigits } from "@/lib/persian";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{
    q?: string;
    grade?: string;
    subject?: string;
    sort?: string;
    sale?: string;
    featured?: string;
    category?: string;
  }>;
};

export default async function StarBookBrowsePage({ searchParams }: PageProps) {
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q : "";
  const grade = typeof params.grade === "string" ? params.grade : "";
  const subject = typeof params.subject === "string" ? params.subject : "";
  const category = typeof params.category === "string" ? params.category : "";
  const sale = params.sale === "1";
  const featuredOnly = params.featured === "1";
  const sortRaw = typeof params.sort === "string" ? params.sort : "featured";
  const sort =
    sortRaw === "newest" || sortRaw === "priceAsc" || sortRaw === "priceDesc"
      ? sortRaw
      : "featured";

  const organization = await getCurrentOrganization();
  const [rawProducts, filters, suggestions, collections] = await Promise.all([
    listPublicCommerceProducts({
      organizationId: organization.id,
      q,
      gradeLabel: grade || undefined,
      subject: subject || undefined,
      categorySlug: category || undefined,
      featured: featuredOnly || undefined,
      sort,
      limit: 80,
    }),
    listPublicCommerceFilters(organization.id),
    listPublicCommerceProducts({ organizationId: organization.id, limit: 40 }),
    listPublicStoreCollections(organization.id),
  ]);
  const products = sale
    ? rawProducts.filter((item) => item.pricing.isOnSale)
    : rawProducts;

  return (
    <StarBookFrame
      activePath="/shop/browse"
      products={suggestions}
      grades={filters.grades}
      subjects={filters.subjects}
    >
      <section className="starbook-hero starbook-hero-immersive">
        <StarBookHeroScene />
        <div className="relative z-[1]">
          <span className="starbook-kicker">کشف</span>
          <h1>هر کتاب، یک مسیر.</h1>
          <StarBookSearch
            products={suggestions}
            grades={filters.grades}
            subjects={filters.subjects}
            defaultQuery={q}
            defaultGrade={grade}
            defaultSubject={subject}
          />
        </div>
      </section>
      <StarBookReveal>
        <section className="starbook-section grid gap-5 lg:grid-cols-[minmax(15rem,18rem)_minmax(0,1fr)]">
          <StarBookFilterPanel
            grades={filters.grades}
            subjects={filters.subjects}
            collections={collections}
            q={q}
            grade={grade}
            subject={subject}
            sort={sort}
            sale={sale}
            featured={featuredOnly}
            category={category}
          />
          <div>
            <p className="mb-4 text-sm text-[var(--sb-muted)]">
              {toPersianDigits(products.length)} کتاب با این فیلتر
            </p>
            {products.length === 0 ? (
              <StarBookEmpty
                title="چیزی با این فیلتر پیدا نشد"
                body="جستجو را کوتاه‌تر کن یا پایه را عوض کن. قفسه‌های دیگر هنوز زنده‌اند."
              />
            ) : (
              <div className="starbook-grid">
                {products.map((product, index) => (
                  <StarBookCard
                    key={product.id}
                    product={product}
                    tone={product.pricing.isOnSale ? "sale" : index % 5 === 0 ? "hero" : "default"}
                    priority={index < 4}
                  />
                ))}
              </div>
            )}
          </div>
        </section>
      </StarBookReveal>
    </StarBookFrame>
  );
}
