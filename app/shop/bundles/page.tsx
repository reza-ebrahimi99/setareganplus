import Link from "next/link";
import { StarBookCard } from "@/components/starbook/StarBookCard";
import { StarBookEmpty } from "@/components/starbook/StarBookEmpty";
import { StarBookFrame } from "@/components/starbook/StarBookFrame";
import { StarBookHeroScene } from "@/components/starbook/StarBookHeroScene";
import {
  StarBookReveal,
  StarBookStagger,
  StarBookStaggerItem,
} from "@/components/starbook/StarBookMotion";
import {
  listPublicCommerceProducts,
  listPublicStoreCollections,
} from "@/lib/commerce/catalog/service";
import { partitionStarBookShelves } from "@/lib/commerce/starbook/merchandising";
import { getCurrentOrganization } from "@/lib/organizations/get-current-organization";

export const dynamic = "force-dynamic";

const PACK_KINDS = [
  { href: "/shop/exam", title: "بسته آزمون", body: "شب امتحان و قلم‌چی", tone: "flash" as const },
  { href: "/shop/major", title: "بسته رشته", body: "ریاضی · تجربی · انسانی", tone: "exam" as const },
  {
    href: "/shop/browse?sort=featured",
    title: "بسته دبیر",
    body: "انتخاب تحریریه برای کلاس",
    tone: "new" as const,
  },
];

export default async function StarBookBundlesPage() {
  const organization = await getCurrentOrganization();
  const [collections, products] = await Promise.all([
    listPublicStoreCollections(organization.id),
    listPublicCommerceProducts({ organizationId: organization.id, limit: 80 }),
  ]);
  const featuredCollections = collections.filter((item) => item.isFeatured);
  const shelves = partitionStarBookShelves(products);
  const pack = shelves.flash.length ? shelves.flash : shelves.featured;

  return (
    <StarBookFrame activePath="/shop/bundles" products={products}>
      <section className="starbook-hero starbook-hero-immersive">
        <StarBookHeroScene />
        <div className="relative z-[1]">
          <span className="starbook-kicker">بسته و کالکشن</span>
          <h1>پلی‌لیست شب امتحان.</h1>
          <p>قفسه‌های چیده‌شده را بردار. پرداخت هر کتاب جدا می‌ماند تا موجودی شعبه دقیق باشد.</p>
        </div>
      </section>

      <StarBookReveal>
        <section className="starbook-section">
          <div className="starbook-section-head">
            <h2>نوع بسته</h2>
          </div>
          <StarBookStagger className="starbook-mosaic">
            {PACK_KINDS.map((item) => (
              <StarBookStaggerItem key={item.href}>
                <Link href={item.href} className="starbook-tile starbook-tile-glow" data-tone={item.tone}>
                  <h3>{item.title}</h3>
                  <p className="mt-2 text-sm text-[var(--sb-muted)]">{item.body}</p>
                </Link>
              </StarBookStaggerItem>
            ))}
          </StarBookStagger>
        </section>
      </StarBookReveal>

      <StarBookReveal>
        <section className="starbook-section">
          <div className="starbook-section-head">
            <h2>کالکشن‌های ویژه</h2>
          </div>
          <StarBookStagger className="starbook-grid">
            {(featuredCollections.length ? featuredCollections : collections).map((collection) => (
              <StarBookStaggerItem key={collection.id}>
                <Link
                  href={`/shop/collections/${collection.slug}`}
                  className="starbook-tile"
                  data-tone="bundle"
                >
                  <h3>{collection.title}</h3>
                  <p className="mt-2 text-sm text-[var(--sb-muted)]">
                    {collection.description || "ورود به این بسته"}
                  </p>
                </Link>
              </StarBookStaggerItem>
            ))}
          </StarBookStagger>
        </section>
      </StarBookReveal>

      {pack.length === 0 ? (
        <StarBookEmpty title="بسته هنوز خالی است" body="به‌محض ویژه شدن کالکشن‌ها اینجا روشن می‌شود." />
      ) : (
        <StarBookReveal>
          <section className="starbook-section">
            <div className="starbook-section-head">
              <h2>کتاب‌های داخل موج</h2>
            </div>
            <div className="starbook-grid">
              {pack.map((product) => (
                <StarBookCard key={product.id} product={product} tone="hero" />
              ))}
            </div>
          </section>
        </StarBookReveal>
      )}
    </StarBookFrame>
  );
}
