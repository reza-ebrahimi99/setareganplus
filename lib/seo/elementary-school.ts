/**
 * ElementarySchool JSON-LD — دبستان غیردولتی ستارگان آینده.
 */

import {
  contactContent,
  institutionEntities,
  schoolStats,
} from "@/content/home";
import {
  absoluteUrl,
  idRef,
  schemaId,
  type JsonLdNode,
} from "@/lib/seo/schema";

function schoolBranch() {
  return contactContent.branches.find(
    (branch) => branch.name === institutionEntities.setareganAyandeh.name,
  );
}

/**
 * Jalali founding year ۱۴۰۱ ≈ Gregorian 2022 (year-level only; no invented day/month).
 */
function foundingYearGregorian(): string {
  return "2022";
}

export function buildElementarySchoolSchema(): JsonLdNode {
  const entity = institutionEntities.setareganAyandeh;
  const branch = schoolBranch();

  const node: JsonLdNode = {
    "@type": "ElementarySchool",
    "@id": schemaId("elementary-school"),
    name: entity.name,
    description: entity.description,
    url: absoluteUrl("/about"),
    parentOrganization: idRef("organization"),
    foundingDate: foundingYearGregorian(),
    numberOfEmployees: schoolStats.teachers,
    areaServed: {
      "@type": "City",
      name: "نسیم‌شهر",
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
