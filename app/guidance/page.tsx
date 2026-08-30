/**
 * Guidance ERP — premium public entry (/guidance).
 * Flag-gated. Auth is reused; no new login backend.
 */

import { GuidanceEntryExperience } from "@/components/guidance/entry/GuidanceEntryExperience";
import { getAdminSession } from "@/lib/auth/require-admin";
import { guidanceEntryContent, guidanceLandingContent } from "@/content/guidance";
import { assertGuidancePublicEnabledOrNotFound } from "@/lib/guidance/require-public";
import { resolvePortalContext } from "@/lib/portal/auth";
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
    name: guidanceEntryContent.title,
    description: guidanceEntryContent.description,
    inLanguage: "fa-IR",
  };

  return serializeJsonLd(createJsonLdGraph([webPage, breadcrumb]));
}

export default async function GuidanceLandingPage() {
  await assertGuidancePublicEnabledOrNotFound();
  const [portal, staff] = await Promise.all([
    resolvePortalContext(),
    getAdminSession(),
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: buildGuidanceLandingJsonLd() }}
      />
      <GuidanceEntryExperience
        studentSignedIn={Boolean(portal)}
        counselorSignedIn={Boolean(staff)}
      />
    </>
  );
}
