import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { PageHero } from "@/components/ui/PageHero";
import { SiteShell } from "@/components/layout/SiteShell";
import { loadPublicAchievementBySlug } from "@/lib/website/achievements";
import { formatJalaliDateShort } from "@/lib/datetime/jalali";
import { siteConfig } from "@/content/site";

export const revalidate = 120;

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const achievement = await loadPublicAchievementBySlug(slug);
  if (!achievement) return { title: "افتخار یافت نشد" };

  const title =
    achievement.seoTitle?.trim() ||
    `${achievement.title} | افتخارات ستارگان`;
  const description =
    achievement.seoDescription?.trim() ||
    achievement.shortDescription ||
    `${achievement.title} — ${achievement.studentName} · ${achievement.categoryName}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "article",
      ...(achievement.coverUrlLarge || achievement.coverUrl
        ? {
            images: [
              {
                url: achievement.coverUrlLarge || achievement.coverUrl!,
                alt: achievement.coverAlt,
              },
            ],
          }
        : {}),
    },
  };
}

export default async function AchievementDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const achievement = await loadPublicAchievementBySlug(slug);
  if (!achievement) notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Achievement",
    name: achievement.title,
    description:
      achievement.description || achievement.shortDescription || undefined,
    image: achievement.coverUrlLarge || achievement.coverUrl || undefined,
    dateAchieved: achievement.achievementDate?.toISOString() || undefined,
    awardedBy: achievement.issuer
      ? { "@type": "Organization", name: achievement.issuer }
      : {
          "@type": "Organization",
          name: "مؤسسه علمی ستارگان",
          alternateName: siteConfig.name,
        },
    recipient: {
      "@type": "Person",
      name: achievement.studentName,
      url: `/students/${achievement.studentSlug}`,
    },
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "صفحه اصلی", item: "/" },
      {
        "@type": "ListItem",
        position: 2,
        name: "افتخارات",
        item: "/achievements",
      },
      {
        "@type": "ListItem",
        position: 3,
        name: achievement.title,
        item: `/achievements/${achievement.slug}`,
      },
    ],
  };

  return (
    <SiteShell activePath="/achievements">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <PageHero
        title={achievement.title}
        subtitle={`${achievement.studentName} · ${achievement.categoryName}`}
        breadcrumbs={[
          { label: "صفحه اصلی", href: "/" },
          { label: "افتخارات", href: "/achievements" },
          { label: achievement.title },
        ]}
      />
      <Container className="py-10 sm:py-14">
        <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
          <article className="admin-card space-y-5 p-6 sm:p-8">
            {(achievement.coverUrlLarge || achievement.coverUrl) && (
              <div className="relative aspect-[16/10] overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 to-secondary/15">
                <Image
                  src={
                    achievement.coverUrlLarge || achievement.coverUrl || ""
                  }
                  alt={achievement.coverAlt}
                  fill
                  unoptimized
                  sizes="(max-width: 1024px) 100vw, 720px"
                  className="object-cover"
                  priority
                />
              </div>
            )}
            {achievement.shortDescription ? (
              <p className="text-base font-medium leading-8 text-secondary">
                {achievement.shortDescription}
              </p>
            ) : null}
            <div className="prose prose-slate max-w-none text-base leading-8 text-foreground">
              {achievement.description ? (
                achievement.description.split(/\n+/).map((paragraph, index) => (
                  <p key={`${index}-${paragraph.slice(0, 24)}`}>{paragraph}</p>
                ))
              ) : (
                <p className="text-muted">توضیحات تکمیلی ثبت نشده است.</p>
              )}
            </div>
          </article>

          <aside className="admin-card space-y-4 p-5 sm:p-6">
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-muted">دانش‌آموز</dt>
                <dd>
                  <Link
                    href={`/students/${achievement.studentSlug}`}
                    className="font-medium text-primary underline"
                  >
                    {achievement.studentName}
                  </Link>
                </dd>
              </div>
              <div>
                <dt className="text-muted">پایه</dt>
                <dd className="text-primary">{achievement.gradeName}</dd>
              </div>
              <div>
                <dt className="text-muted">دسته‌بندی</dt>
                <dd className="text-primary">{achievement.categoryName}</dd>
              </div>
              {achievement.achievementDate ? (
                <div>
                  <dt className="text-muted">تاریخ</dt>
                  <dd className="text-primary">
                    {formatJalaliDateShort(achievement.achievementDate)}
                  </dd>
                </div>
              ) : null}
              {achievement.schoolYear ? (
                <div>
                  <dt className="text-muted">سال تحصیلی</dt>
                  <dd className="text-primary">{achievement.schoolYear}</dd>
                </div>
              ) : null}
              {achievement.issuer ? (
                <div>
                  <dt className="text-muted">صادرکننده</dt>
                  <dd className="text-primary">{achievement.issuer}</dd>
                </div>
              ) : null}
              {achievement.level ? (
                <div>
                  <dt className="text-muted">سطح</dt>
                  <dd className="text-primary">{achievement.level}</dd>
                </div>
              ) : null}
              {achievement.place ? (
                <div>
                  <dt className="text-muted">مقام</dt>
                  <dd className="text-primary">{achievement.place}</dd>
                </div>
              ) : null}
              {achievement.score ? (
                <div>
                  <dt className="text-muted">امتیاز</dt>
                  <dd className="text-primary">{achievement.score}</dd>
                </div>
              ) : null}
            </dl>

            {achievement.certificateUrl ? (
              <a
                href={achievement.certificateUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-4 text-sm font-medium text-white"
              >
                {achievement.certificateIsPdf
                  ? "دانلود گواهی PDF"
                  : "مشاهده گواهی"}
              </a>
            ) : null}

            <Link
              href="/achievements"
              className="inline-flex text-sm text-primary underline"
            >
              بازگشت به فهرست افتخارات
            </Link>
          </aside>
        </div>
      </Container>
    </SiteShell>
  );
}
