/**
 * Organization JSON-LD — umbrella brand identity for ستارگان پلاس.
 */

import {
  branding,
  contactContent,
  heroMedia,
} from "@/content/home";
import {
  absoluteUrl,
  schemaId,
  type JsonLdNode,
} from "@/lib/seo/schema";
import { DEFAULT_DESCRIPTION, SITE_NAME, SITE_ORIGIN } from "@/lib/seo/site-metadata";

function telephoneNumbers(): string[] {
  return contactContent.phones.map((phone) =>
    phone.href.replace(/^tel:/i, ""),
  );
}

function sameAsLinks(): string[] {
  return contactContent.social.map((item) => item.href);
}

export function buildOrganizationSchema(): JsonLdNode {
  return {
    "@type": "Organization",
    "@id": schemaId("organization"),
    name: SITE_NAME,
    alternateName: [branding.secondary, branding.tertiary],
    url: SITE_ORIGIN,
    logo: absoluteUrl(heroMedia.logo.url),
    image: absoluteUrl(heroMedia.logo.url),
    description: DEFAULT_DESCRIPTION,
    telephone: telephoneNumbers(),
    sameAs: sameAsLinks(),
    areaServed: {
      "@type": "City",
      name: "نسیم‌شهر",
    },
  };
}
