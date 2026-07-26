import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { PageHero } from "@/components/ui/PageHero";
import { SiteShell } from "@/components/layout/SiteShell";
import { TopRankArchiveViewer } from "@/components/achievements/TopRankArchiveViewer";
import { createPageMetadata } from "@/lib/seo/create-page-metadata";
import { SITE_ORIGIN } from "@/lib/seo/site-metadata";
import { TOP_RANK_ARCHIVE_PUBLIC_PATH } from "@/lib/website/top-rank-archive-constants";
import { loadPublicTopRankArchives } from "@/lib/website/top-rank-archive-public";

export const revalidate = 120;

export const metadata: Metadata = createPageMetadata({
  path: TOP_RANK_ARCHIVE_PUBLIC_PATH,
  title: "آرشیو رتبه‌های برتر کنکور | ستارگان پلاس",
  description:
    "آرشیو تصویری رتبه‌های برتر کنکور به تفکیک سال شمسی؛ همراهی کانون فرهنگی آموزش (قلم‌چی) با مسیر موفقیت دانش‌آموزان.",
  keywords: [
    "رتبه‌های برتر کنکور",
    "آرشیو قلم چی",
    "ستارگان پلاس",
    "نسیم شهر",
  ],
});

export default async function TopRankArchivePublicPage() {
  let items: Awaited<ReturnType<typeof loadPublicTopRankArchives>> = [];
  let loadError = false;

  try {
    items = await loadPublicTopRankArchives();
  } catch {
    loadError = true;
  }

  const jsonLd =
    items.length > 0
      ? {
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: "آرشیو رتبه‌های برتر کنکور",
          description:
            "مجموعه تصاویر آرشیوی رتبه‌های برتر کنکور به تفکیک سال شمسی.",
          url: `${SITE_ORIGIN}${TOP_RANK_ARCHIVE_PUBLIC_PATH}`,
          hasPart: items.map((item) => ({
            "@type": "ImageObject",
            name: item.title,
            contentUrl: item.imageUrl,
            description: item.description || item.title,
          })),
        }
      : null;

  return (
    <SiteShell activePath={TOP_RANK_ARCHIVE_PUBLIC_PATH}>
      {jsonLd ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      ) : null}
      <PageHero
        title="آرشیو رتبه‌های برتر کنکور"
        subtitle="نگاهی به مسیر افتخار؛ تصاویر رتبه‌های برتر به تفکیک سال، در کنار همراهی کانون فرهنگی آموزش (قلم‌چی)."
        breadcrumbs={[
          { label: "صفحه اصلی", href: "/" },
          { label: "دستاوردها", href: "/achievements" },
          { label: "آرشیو رتبه‌های برتر" },
        ]}
        eyebrow="دستاوردها"
      />
      <Container className="py-10 sm:py-14">
        {loadError ? (
          <div
            role="alert"
            className="rounded-2xl border border-red-200 bg-red-50 px-6 py-10 text-center"
          >
            <p className="text-base font-semibold text-red-900">
              بارگذاری آرشیو ممکن نشد
            </p>
            <p className="mt-2 text-sm leading-7 text-red-800">
              لطفاً چند لحظه دیگر دوباره تلاش کنید.
            </p>
          </div>
        ) : (
          <TopRankArchiveViewer items={items} />
        )}
      </Container>
    </SiteShell>
  );
}
