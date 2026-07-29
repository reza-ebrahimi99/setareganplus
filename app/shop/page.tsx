import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { PageHero } from "@/components/ui/PageHero";
import { SiteShell } from "@/components/layout/SiteShell";
import { ShopProductCard } from "@/components/shop/ShopProductCard";
import {
  listPublicCommerceFilters,
  listPublicCommerceProducts,
} from "@/lib/commerce/catalog/service";
import { getCurrentOrganization } from "@/lib/organizations/get-current-organization";
import { getPublicPageMetadata } from "@/lib/seo/public-pages";

export const revalidate = 120;

export const metadata = getPublicPageMetadata("shop");

type PageProps = {
  searchParams: Promise<{
    q?: string;
    grade?: string;
    subject?: string;
  }>;
};

export default async function ShopPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q : "";
  const grade = typeof params.grade === "string" ? params.grade : "";
  const subject = typeof params.subject === "string" ? params.subject : "";

  const organization = await getCurrentOrganization();
  const [products, filters] = await Promise.all([
    listPublicCommerceProducts({
      organizationId: organization.id,
      q,
      gradeLabel: grade || undefined,
      subject: subject || undefined,
    }),
    listPublicCommerceFilters(organization.id),
  ]);

  return (
    <SiteShell activePath="/shop">
      <Container className="py-8 sm:py-10">
        <PageHero
          eyebrow="فروشگاه آموزشی"
          title="فروشگاه محصولات آموزشی ستارگان"
          subtitle="جزوه‌ها و محصولات آموزشی فعال مؤسسه را جستجو کنید، بر اساس پایه و درس فیلتر بزنید و وارد صفحه خرید شوید."
          breadcrumbs={[
            { label: "صفحه اصلی", href: "/" },
            { label: "فروشگاه" },
          ]}
        />

        <section className="rounded-3xl border border-border bg-surface p-4 shadow-sm sm:p-6">
          <form className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <label className="block text-sm">
              <span className="mb-1.5 block text-muted">جستجو</span>
              <input
                name="q"
                defaultValue={q}
                placeholder="نام محصول، مؤلف، درس یا پایه"
                className="min-h-11 w-full rounded-xl border border-border bg-white px-3 py-2.5"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1.5 block text-muted">پایه</span>
              <select
                name="grade"
                defaultValue={grade}
                className="min-h-11 w-full rounded-xl border border-border bg-white px-3 py-2.5"
              >
                <option value="">همه پایه‌ها</option>
                {filters.grades.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="mb-1.5 block text-muted">درس</span>
              <select
                name="subject"
                defaultValue={subject}
                className="min-h-11 w-full rounded-xl border border-border bg-white px-3 py-2.5"
              >
                <option value="">همه درس‌ها</option>
                {filters.subjects.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex items-end gap-2">
              <button
                type="submit"
                className="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary/92"
              >
                جستجو و فیلتر
              </button>
              <Button href="/shop" variant="outline" className="min-h-11">
                پاک‌کردن
              </Button>
            </div>
          </form>
        </section>

        {products.length > 0 ? (
          <section className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 xl:gap-6">
            {products.map((product, index) => (
              <ShopProductCard
                key={product.id}
                product={product}
                priority={index < 3}
              />
            ))}
          </section>
        ) : (
          <section className="mt-8 rounded-3xl border border-dashed border-border bg-surface px-6 py-10 text-center shadow-sm">
            <h2 className="text-xl font-bold text-primary">
              فعلاً محصول فعالی برای نمایش نداریم
            </h2>
            <p className="mt-3 text-sm leading-7 text-muted">
              به‌محض انتشار جزوه‌ها و محصولات آموزشی جدید، همین صفحه به‌روزرسانی
              می‌شود.
            </p>
          </section>
        )}
      </Container>
    </SiteShell>
  );
}
