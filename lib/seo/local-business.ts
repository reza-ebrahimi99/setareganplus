/**
 * LocalBusiness JSON-LD — local NAP for the education center in نسیم‌شهر.
 * Uses verified phones, hours, and a primary branch address from content/home.
 */

import { contactContent, institutionEntities } from "@/content/home";
import {
  absoluteUrl,
  idRef,
  schemaId,
  type JsonLdNode,
} from "@/lib/seo/schema";
import { SITE_ORIGIN } from "@/lib/seo/site-metadata";

/** Primary public branch used for local NAP (boys branch). */
function primaryBranch() {
  return (
    contactContent.branches.find((branch) => branch.name === "شعبه پسران") ??
    contactContent.branches[0]
  );
}

function telephoneNumbers(): string[] {
  return contactContent.phones.map((phone) =>
    phone.href.replace(/^tel:/i, ""),
  );
}

/**
 * Opening hours from verified copy:
 * - general days ۱۲:۰۰–۲۰:۳۰
 * - Thursday ۱۰:۰۰–۲۰:۳۰
 */
function openingHoursSpecification(): JsonLdNode[] {
  return [
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: [
        "Saturday",
        "Sunday",
        "Monday",
        "Tuesday",
        "Wednesday",
        "Friday",
      ],
      opens: "12:00",
      closes: "20:30",
    },
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: "Thursday",
      opens: "10:00",
      closes: "20:30",
    },
  ];
}

export function buildLocalBusinessSchema(): JsonLdNode {
  const branch = primaryBranch();
  const entity = institutionEntities.setareganPlus;

  const node: JsonLdNode = {
    "@type": "LocalBusiness",
    "@id": schemaId("local-business"),
    name: entity.name,
    description: entity.description,
    url: SITE_ORIGIN,
    parentOrganization: idRef("organization"),
    telephone: telephoneNumbers(),
    openingHoursSpecification: openingHoursSpecification(),
    areaServed: {
      "@type": "City",
      name: "نسیم‌شهر",
    },
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer service",
      telephone: telephoneNumbers(),
      areaServed: "نسیم‌شهر",
      availableLanguage: ["fa", "Persian"],
      url: absoluteUrl("/contact"),
    },
  };

  if (branch) {
    node.address = {
      "@type": "PostalAddress",
      streetAddress: branch.address,
      addressLocality: "نسیم‌شهر",
      addressCountry: "IR",
    };
    node.hasMap = branch.mapUrl;
  }

  return node;
}
