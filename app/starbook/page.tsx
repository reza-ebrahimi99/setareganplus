import Link from "next/link";
import { StarBookEmpty } from "@/components/starbook/StarBookEmpty";
import { StarBookFrame } from "@/components/starbook/StarBookFrame";
import { StarBookHeroScene } from "@/components/starbook/StarBookHeroScene";
import {
  StarBookMagnetic,
  StarBookReveal,
  StarBookStagger,
  StarBookStaggerItem,
} from "@/components/starbook/StarBookMotion";
import { StarBookPlayHud } from "@/components/starbook/StarBookPlayHud";
import { StarBookRecentlyViewed } from "@/components/starbook/StarBookRecentlyViewed";
import { StarBookRecommended } from "@/components/starbook/StarBookRecommended";
import { StarBookRail } from "@/components/starbook/StarBookRail";
import { StarBookSearch } from "@/components/starbook/StarBookSearch";
import { STARBOOK_CAMPAIGNS } from "@/lib/commerce/starbook/campaigns";
import { loadStarBookHome } from "@/lib/commerce/starbook/merchandising";
import { getCurrentOrganization } from "@/lib/organizations/get-current-organization";
import { createPageMetadata } from "@/lib/seo/create-page-metadata";

export const dynamic = "force-dynamic";

export const metadata = createPageMetadata({
  path: "/",
  title: "استاربوک | کتاب‌فروشی آموزشی ستارگان پلاس",
  description:
    "استاربوک، فروشگاه آموزشی ستارگان پلاس برای دانش‌آموزان؛ کشف کتاب، حراج زنده، کالکشن پایه و خرید با تحویل حضوری.",
});

export default async function StarBookHomePage() {
  const organization = await getCurrentOrganization();
  const home = await loadStarBookHome(organization.id);
  const { shelves, products, filters, collections } = home;
  const teacherPicks = shelves.featured.length ? shelves.featured : shelves.trending;
  const counselorPicks = shelves.bestsellers;

  return (
    <StarBookFrame
      activePath="/"
      products={products}
      grades={filters.grades}
      subjects={filters.subjects}
    >
      <section className="starbook-hero starbook-hero-immersive">
        <StarBookHeroScene />
        <div className="relative z-[1]">
          <span className="starbook-kicker">استاربوک · ۱۲ تا ۱۹ ساله · زنده مثل پلی‌لیست</span>
          <h1>کتابی که شب امتحان نجاتت می‌دهد.</h1>
          <p>
            فروشگاه آموزشی ستارگان؛ رنگی، سریع و مخصوص تو. جزوه، جمع‌بندی، آزمون و بسته‌ها را مثل
            استوری کشف کن — بعد حضوری از شعبه بگیر.
          </p>
          <div className="starbook-cta-row">
            <StarBookMagnetic href="/browse">شروع کشف</StarBookMagnetic>
            <Link href="/campaigns/flash-konkur" className="starbook-btn starbook-btn-ghost">
              حراج زنده
            </Link>
          </div>
          <StarBookSearch
            products={products}
            grades={filters.grades}
            subjects={filters.subjects}
          />
          <StarBookPlayHud />
        </div>
      </section>

      <StarBookReveal>
        <section className="starbook-section">
          <div className="starbook-section-head">
            <div>
              <h2>کمپین‌های در حال پخش</h2>
              <p>مثل استوری؛ هر کدام یک حال‌وهوا.</p>
            </div>
          </div>
          <StarBookStagger className="starbook-mosaic">
            {STARBOOK_CAMPAIGNS.map((campaign) => (
              <StarBookStaggerItem key={campaign.slug}>
                <Link href={campaign.href} className="starbook-tile starbook-tile-glow" data-tone={campaign.tone}>
                  <p className="starbook-kicker">{campaign.eyebrow}</p>
                  <h3 className="mt-3">{campaign.title}</h3>
                  <p className="mt-2 text-sm leading-7 text-[var(--sb-muted)]">{campaign.subtitle}</p>
                </Link>
              </StarBookStaggerItem>
            ))}
          </StarBookStagger>
        </section>
      </StarBookReveal>

      {products.length === 0 ? (
        <StarBookEmpty
          title="قفسه هنوز خالی است"
          body="به‌محض انتشار کتاب‌های فعال، استاربوک زنده می‌شود."
        />
      ) : (
        <>
          <StarBookReveal>
            <StarBookRail
              title="ترند امروز"
              subtitle="آنچه دانش‌آموزها الان باز می‌کنند."
              href="/browse"
              products={shelves.trending}
              tone="hero"
            />
          </StarBookReveal>
          <StarBookReveal delay={0.05}>
            <StarBookRail
              title="پرفروش‌ها"
              subtitle="قفسه‌ای که زود تمام می‌شود."
              href="/browse?sort=featured"
              products={shelves.bestsellers}
            />
          </StarBookReveal>
          <StarBookReveal delay={0.05}>
            <StarBookRail
              title="تازه‌رسیده‌ها"
              subtitle="جلدهای جدید، هنوز گرم از چاپ."
              href="/browse?sort=newest"
              products={shelves.newest}
            />
          </StarBookReveal>
          <StarBookReveal>
            <StarBookRail
              title="پیشنهاد دبیر"
              subtitle="انتخاب تحریریه برای کلاس و تکلیف."
              href="/browse?sort=featured"
              products={teacherPicks}
              tone="hero"
            />
          </StarBookReveal>
          <StarBookReveal>
            <StarBookRail
              title="پیشنهاد مشاور"
              subtitle="مسیر جمع‌بندی و شب امتحان."
              href="/exam"
              products={counselorPicks}
            />
          </StarBookReveal>
          <StarBookReveal>
            <StarBookRail
              title="فصل امتحان"
              subtitle="آزمون، جمع‌بندی، قلم‌چی."
              href="/exam"
              products={shelves.flash.length ? shelves.flash : shelves.trending}
              tone="sale"
            />
          </StarBookReveal>
          <StarBookReveal>
            <StarBookRail
              title="حراج فلش"
              subtitle="قیمت ویژه تا وقتی موجودی شعبه تمام شود."
              href="/campaigns/flash-konkur"
              products={shelves.flash}
              tone="sale"
            />
          </StarBookReveal>
        </>
      )}

      {filters.grades.length > 0 ? (
        <StarBookReveal>
          <section className="starbook-section">
            <div className="starbook-section-head">
              <h2>بر اساس پایه</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {filters.grades.map((grade) => (
                <Link key={grade} href={`/grade/${encodeURIComponent(grade)}`} className="starbook-chip">
                  {grade}
                </Link>
              ))}
            </div>
          </section>
        </StarBookReveal>
      ) : null}

      {filters.subjects.length > 0 ? (
        <StarBookReveal>
          <section className="starbook-section">
            <div className="starbook-section-head">
              <h2>بر اساس درس</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {filters.subjects.map((subject) => (
                <Link
                  key={subject}
                  href={`/subject/${encodeURIComponent(subject)}`}
                  className="starbook-chip"
                >
                  {subject}
                </Link>
              ))}
            </div>
          </section>
        </StarBookReveal>
      ) : null}

      <StarBookReveal>
        <section className="starbook-section">
          <div className="starbook-section-head">
            <h2>کالکشن‌ها و بسته‌ها</h2>
            <Link href="/collections" className="starbook-chip">
              همه
            </Link>
          </div>
          <StarBookStagger className="starbook-grid">
            {collections.slice(0, 8).map((collection) => (
              <StarBookStaggerItem key={collection.id}>
                <Link
                  href={`/collections/${collection.slug}`}
                  className="starbook-tile"
                  data-tone={collection.isFeatured ? "exam" : "new"}
                >
                  <h3>{collection.title}</h3>
                  <p className="mt-2 text-sm text-[var(--sb-muted)]">
                    {collection.description || "یک قفسه انتخاب‌شده برای مسیر تو"}
                  </p>
                </Link>
              </StarBookStaggerItem>
            ))}
            <StarBookStaggerItem>
              <Link href="/bundles" className="starbook-tile" data-tone="bundle">
                <h3>بسته‌های شب امتحان</h3>
                <p className="mt-2 text-sm text-[var(--sb-muted)]">پلی‌لیست کامل برای یک موج</p>
              </Link>
            </StarBookStaggerItem>
            <StarBookStaggerItem>
              <Link href="/major" className="starbook-tile" data-tone="exam">
                <h3>بر اساس رشته</h3>
                <p className="mt-2 text-sm text-[var(--sb-muted)]">ریاضی، تجربی، انسانی</p>
              </Link>
            </StarBookStaggerItem>
          </StarBookStagger>
        </section>
      </StarBookReveal>

      <StarBookRecommended catalog={products} />
      <StarBookRecentlyViewed catalog={products} />
    </StarBookFrame>
  );
}
