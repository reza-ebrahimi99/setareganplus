import {
  FormVersionStatus,
  SitePlacementContentType,
  SitePlacementDisplayMode,
  SitePlacementKey,
  type FormPurpose,
} from "@/generated/prisma/enums";
import { getCurrentOrganization } from "@/lib/organizations/get-current-organization";
import { getEnvFallbackSlug } from "@/lib/site/page-integrations";
import {
  SITE_PLACEMENT_REGISTRY,
  type PlacementSource,
  type SiteDisplayModeValue,
  type SitePlacementKeyValue,
} from "@/lib/site/placement-registry";
import { prisma } from "@/lib/prisma";

export type ResolvedFormPlacement = {
  kind: "form";
  source: PlacementSource;
  placementKey: SitePlacementKeyValue;
  slug: string;
  displayMode: "full" | "embedded" | "compact";
  showPoster: boolean;
  heading: string | null;
  description: string | null;
  formTitle: string | null;
  warning: string | null;
};

export type ResolvedBookingPlacement = {
  kind: "booking";
  source: PlacementSource;
  placementKey: SitePlacementKeyValue;
  slug: string;
  displayMode: "full" | "card" | "compact";
  ctaLabel: string | null;
  heading: string | null;
  description: string | null;
  serviceTitle: string | null;
  warning: string | null;
};

export type ResolvedNonePlacement = {
  kind: "none";
  source: PlacementSource;
  placementKey: SitePlacementKeyValue;
  reason: "disabled" | "unset" | "invalid";
  warning: string | null;
};

export type ResolvedSitePlacement =
  | ResolvedFormPlacement
  | ResolvedBookingPlacement
  | ResolvedNonePlacement;

function toFormDisplayMode(
  mode: SiteDisplayModeValue | SitePlacementDisplayMode,
): "full" | "embedded" | "compact" {
  if (mode === "FULL") return "full";
  if (mode === "COMPACT") return "compact";
  return "embedded";
}

function toBookingDisplayMode(
  mode: SiteDisplayModeValue | SitePlacementDisplayMode,
): "full" | "card" | "compact" {
  if (mode === "FULL") return "full";
  if (mode === "COMPACT") return "compact";
  return "card";
}

async function loadPublishedFormSlug(params: {
  organizationId: string;
  formId: string;
}): Promise<{ slug: string; title: string } | null> {
  const form = await prisma.form.findFirst({
    where: {
      id: params.formId,
      organizationId: params.organizationId,
      deletedAt: null,
      publishedVersionId: { not: null },
    },
    select: {
      slug: true,
      publishedVersionId: true,
      publishedVersion: {
        select: {
          status: true,
          title: true,
        },
      },
    },
  });

  if (
    !form ||
    !form.publishedVersionId ||
    !form.publishedVersion ||
    form.publishedVersion.status !== FormVersionStatus.PUBLISHED
  ) {
    return null;
  }

  return { slug: form.slug, title: form.publishedVersion.title };
}

async function loadActiveBookingSlug(params: {
  organizationId: string;
  bookingServiceId: string;
}): Promise<{ slug: string; title: string } | null> {
  const service = await prisma.bookingService.findFirst({
    where: {
      id: params.bookingServiceId,
      organizationId: params.organizationId,
      deletedAt: null,
      isActive: true,
    },
    select: { slug: true, title: true },
  });
  return service;
}

/**
 * Resolves one placement for the current organization.
 * DB enabled → env → none. Disabled DB row suppresses env.
 */
export async function loadResolvedSitePlacement(
  placementKey: SitePlacementKeyValue,
  organizationId?: string,
): Promise<ResolvedSitePlacement> {
  const registry = SITE_PLACEMENT_REGISTRY[placementKey];
  let orgId = organizationId;

  try {
    if (!orgId) {
      const organization = await getCurrentOrganization();
      orgId = organization.id;
    }
  } catch {
    return {
      kind: "none",
      source: "none",
      placementKey,
      reason: "invalid",
      warning: "سامانه موقتاً در دسترس نیست.",
    };
  }

  const row = await prisma.sitePlacement.findFirst({
    where: {
      organizationId: orgId,
      placementKey: placementKey as SitePlacementKey,
      deletedAt: null,
    },
    select: {
      contentType: true,
      formId: true,
      bookingServiceId: true,
      displayMode: true,
      showPoster: true,
      isEnabled: true,
      heading: true,
      description: true,
      ctaLabel: true,
    },
  });

  if (row && !row.isEnabled) {
    return {
      kind: "none",
      source: "disabled",
      placementKey,
      reason: "disabled",
      warning: null,
    };
  }

  if (row && row.isEnabled) {
    if (row.contentType === SitePlacementContentType.FORM && row.formId) {
      const form = await loadPublishedFormSlug({
        organizationId: orgId,
        formId: row.formId,
      });
      if (!form) {
        return {
          kind: "none",
          source: "database",
          placementKey,
          reason: "invalid",
          warning:
            "فرم انتخاب‌شده دیگر منتشر نیست یا در دسترس نیست. از پنل مدیریت جایگاه را به‌روز کنید.",
        };
      }
      return {
        kind: "form",
        source: "database",
        placementKey,
        slug: form.slug,
        displayMode: toFormDisplayMode(row.displayMode),
        showPoster: row.showPoster,
        heading: row.heading,
        description: row.description,
        formTitle: form.title,
        warning: null,
      };
    }

    if (
      row.contentType === SitePlacementContentType.BOOKING &&
      row.bookingServiceId
    ) {
      const service = await loadActiveBookingSlug({
        organizationId: orgId,
        bookingServiceId: row.bookingServiceId,
      });
      if (!service) {
        return {
          kind: "none",
          source: "database",
          placementKey,
          reason: "invalid",
          warning:
            "خدمت نوبت‌دهی انتخاب‌شده غیرفعال است یا یافت نشد. از پنل مدیریت جایگاه را به‌روز کنید.",
        };
      }
      return {
        kind: "booking",
        source: "database",
        placementKey,
        slug: service.slug,
        displayMode: toBookingDisplayMode(row.displayMode),
        ctaLabel: row.ctaLabel,
        heading: row.heading,
        description: row.description,
        serviceTitle: service.title,
        warning: null,
      };
    }

    return {
      kind: "none",
      source: "database",
      placementKey,
      reason: "unset",
      warning: null,
    };
  }

  // No DB row → transitional env fallback
  const envSlug = getEnvFallbackSlug(placementKey);
  if (!envSlug) {
    return {
      kind: "none",
      source: "none",
      placementKey,
      reason: "unset",
      warning: null,
    };
  }

  if (registry.allowedContentTypes.includes("FORM")) {
    return {
      kind: "form",
      source: "env",
      placementKey,
      slug: envSlug,
      displayMode: toFormDisplayMode(registry.defaultDisplayMode),
      showPoster: false,
      heading: null,
      description: null,
      formTitle: null,
      warning: null,
    };
  }

  return {
    kind: "booking",
    source: "env",
    placementKey,
    slug: envSlug,
    displayMode: toBookingDisplayMode(registry.defaultDisplayMode),
    ctaLabel: null,
    heading: null,
    description: null,
    serviceTitle: null,
    warning: null,
  };
}

export type SelectablePublishedForm = {
  id: string;
  slug: string;
  purpose: FormPurpose;
  title: string;
};

export type SelectableBookingService = {
  id: string;
  slug: string;
  title: string;
  branchName: string | null;
};

export async function listSelectablePublishedForms(
  organizationId: string,
): Promise<SelectablePublishedForm[]> {
  const forms = await prisma.form.findMany({
    where: {
      organizationId,
      deletedAt: null,
      publishedVersionId: { not: null },
      publishedVersion: {
        status: FormVersionStatus.PUBLISHED,
      },
    },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      slug: true,
      purpose: true,
      publishedVersion: { select: { title: true } },
    },
  });

  return forms.map((form) => ({
    id: form.id,
    slug: form.slug,
    purpose: form.purpose,
    title: form.publishedVersion?.title ?? form.slug,
  }));
}

export async function listSelectableBookingServices(
  organizationId: string,
): Promise<SelectableBookingService[]> {
  const services = await prisma.bookingService.findMany({
    where: {
      organizationId,
      deletedAt: null,
      isActive: true,
    },
    orderBy: { title: "asc" },
    select: {
      id: true,
      slug: true,
      title: true,
      branch: { select: { name: true } },
    },
  });

  return services.map((service) => ({
    id: service.id,
    slug: service.slug,
    title: service.title,
    branchName: service.branch?.name ?? null,
  }));
}
