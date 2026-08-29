/**
 * Guidance ERP — public landing (/guidance).
 * Flag-gated; marketing surface only (Phase 0 Step 3).
 */

import { InnerPageLayout } from "@/components/layout/InnerPageLayout";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { guidanceLandingContent } from "@/content/guidance";
import { assertGuidancePublicEnabledOrNotFound } from "@/lib/guidance/require-public";
import { getPublicPageMetadata } from "@/lib/seo/public-pages";
import {
  absoluteUrl,
  createJsonLdGraph,
  serializeJsonLd,
  type JsonLdNode,
} from "@/lib/seo/schema";

export const dynamic = "force-dynamic";

export const metadata = getPublicPageMetadata("guidance");

function buildGuidanceLandingJsonLd(): string {
  const breadcrumb: JsonLdNode = {
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "صفحه اصلی",
        item: absoluteUrl("/"),
      },
      {
        "@type": "ListItem",
        position: 2,
        name: guidanceLandingContent.title,
        item: absoluteUrl("/guidance"),
      },
    ],
  };

  const webPage: JsonLdNode = {
    "@type": "WebPage",
    "@id": absoluteUrl("/guidance"),
    url: absoluteUrl("/guidance"),
    name: guidanceLandingContent.title,
    description: guidanceLandingContent.heroMessage,
    inLanguage: "fa-IR",
  };

  const faq: JsonLdNode = {
    "@type": "FAQPage",
    mainEntity: guidanceLandingContent.faqPreview.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };

  return serializeJsonLd(createJsonLdGraph([webPage, breadcrumb, faq]));
}

export default async function GuidanceLandingPage() {
  await assertGuidancePublicEnabledOrNotFound();

  return (
    <InnerPageLayout
      activePath="/guidance"
      breadcrumbs={guidanceLandingContent.breadcrumbs}
      title={guidanceLandingContent.title}
      subtitle={guidanceLandingContent.heroMessage}
      eyebrow={guidanceLandingContent.eyebrow}
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: buildGuidanceLandingJsonLd() }}
      />

      <div className="space-y-10">
        <p className="max-w-3xl text-base leading-8 text-muted sm:text-lg">
          {guidanceLandingContent.subtitle}
        </p>

        <div>
          <Button href={guidanceLandingContent.primaryCta.href} variant="primary">
            {guidanceLandingContent.primaryCta.label}
          </Button>
        </div>

        <ul className="grid gap-4 sm:grid-cols-2">
          {guidanceLandingContent.comingSoonCards.map((card) => (
            <li
              key={card.title}
              aria-disabled="true"
              className="rounded-2xl border border-border bg-surface p-5 opacity-80"
            >
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-lg font-semibold text-primary">
                  {card.title}
                </h2>
                <StatusBadge tone="development">{card.badge}</StatusBadge>
              </div>
              <p className="mt-3 text-sm leading-7 text-muted">
                {card.description}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </InnerPageLayout>
  );
}
