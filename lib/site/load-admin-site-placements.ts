import {
  FormVersionStatus,
} from "@/generated/prisma/enums";
import { getAdminSession } from "@/lib/auth/require-admin";
import { getFormPurposeLabel } from "@/lib/forms/form-purpose-labels";
import { getEnvFallbackSlug } from "@/lib/site/page-integrations";
import {
  listSelectableBookingServices,
  listSelectablePublishedForms,
} from "@/lib/site/load-site-placement";
import {
  SITE_PLACEMENT_LIST,
  type PlacementSource,
  type SiteDisplayModeValue,
  type SitePlacementKeyValue,
} from "@/lib/site/placement-registry";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export type AdminPlacementCardData = {
  key: SitePlacementKeyValue;
  label: string;
  targetPath: string;
  targetPageLabel: string;
  supportsShowPoster: boolean;
  supportsCtaLabel: boolean;
  allowedContentTypes: ReadonlyArray<"FORM" | "BOOKING">;
  isEnabled: boolean;
  contentType: "FORM" | "BOOKING" | "NONE";
  formId: string | null;
  bookingServiceId: string | null;
  displayMode: SiteDisplayModeValue;
  showPoster: boolean;
  heading: string;
  description: string;
  ctaLabel: string;
  hasDatabaseRow: boolean;
  sourceHint: PlacementSource;
  envFallbackSlug: string | null;
  warning: string | null;
  selectedSummary: string | null;
};

export type AdminSitePlacementsPageData = {
  forms: Array<{
    id: string;
    slug: string;
    title: string;
    purposeLabel: string;
  }>;
  bookingServices: Array<{
    id: string;
    slug: string;
    title: string;
    branchName: string | null;
  }>;
  placements: AdminPlacementCardData[];
};

export async function loadAdminSitePlacements(): Promise<
  | { ok: true; data: AdminSitePlacementsPageData }
  | { ok: false; reason: "unavailable" }
> {
  const session = await getAdminSession();
  if (!session) {
    redirect("/admin/login");
  }
  const organizationId = session.organization.id;

  try {
    const [forms, bookingServices, rows] = await Promise.all([
      listSelectablePublishedForms(organizationId),
      listSelectableBookingServices(organizationId),
      prisma.sitePlacement.findMany({
        where: { organizationId, deletedAt: null },
        select: {
          placementKey: true,
          contentType: true,
          formId: true,
          bookingServiceId: true,
          displayMode: true,
          showPoster: true,
          isEnabled: true,
          heading: true,
          description: true,
          ctaLabel: true,
          form: {
            select: {
              slug: true,
              deletedAt: true,
              publishedVersionId: true,
              publishedVersion: {
                select: { status: true, title: true },
              },
            },
          },
          bookingService: {
            select: {
              slug: true,
              title: true,
              isActive: true,
              deletedAt: true,
            },
          },
        },
      }),
    ]);

    const byKey = new Map(
      rows.map((row) => [row.placementKey as SitePlacementKeyValue, row]),
    );

    const placements: AdminPlacementCardData[] = SITE_PLACEMENT_LIST.map(
      (entry) => {
        const row = byKey.get(entry.key);
        const envFallbackSlug = getEnvFallbackSlug(entry.key);

        if (!row) {
          return {
            key: entry.key,
            label: entry.label,
            targetPath: entry.targetPath,
            targetPageLabel: entry.targetPageLabel,
            supportsShowPoster: entry.supportsShowPoster,
            supportsCtaLabel: entry.supportsCtaLabel,
            allowedContentTypes: entry.allowedContentTypes,
            isEnabled: false,
            contentType: "NONE",
            formId: null,
            bookingServiceId: null,
            displayMode: entry.defaultDisplayMode,
            showPoster: false,
            heading: "",
            description: "",
            ctaLabel: "",
            hasDatabaseRow: false,
            sourceHint: envFallbackSlug ? "env" : "none",
            envFallbackSlug,
            warning: null,
            selectedSummary: envFallbackSlug
              ? `پشتیبان سرور: ${envFallbackSlug}`
              : null,
          };
        }

        let warning: string | null = null;
        let selectedSummary: string | null = null;

        if (row.contentType === "FORM") {
          const form = row.form;
          if (
            !form ||
            form.deletedAt ||
            !form.publishedVersionId ||
            form.publishedVersion?.status !== FormVersionStatus.PUBLISHED
          ) {
            warning =
              "فرم انتخاب‌شده دیگر منتشر نیست. لطفاً فرم دیگری انتخاب کنید یا جایگاه را غیرفعال کنید.";
          } else {
            selectedSummary = `${form.publishedVersion.title} (${form.slug})`;
          }
        }

        if (row.contentType === "BOOKING") {
          const service = row.bookingService;
          if (!service || service.deletedAt || !service.isActive) {
            warning =
              "خدمت نوبت‌دهی انتخاب‌شده غیرفعال است یا حذف شده است. لطفاً خدمت دیگری انتخاب کنید.";
          } else {
            selectedSummary = `${service.title} (${service.slug})`;
          }
        }

        return {
          key: entry.key,
          label: entry.label,
          targetPath: entry.targetPath,
          targetPageLabel: entry.targetPageLabel,
          supportsShowPoster: entry.supportsShowPoster,
          supportsCtaLabel: entry.supportsCtaLabel,
          allowedContentTypes: entry.allowedContentTypes,
          isEnabled: row.isEnabled,
          contentType: row.contentType,
          formId: row.formId,
          bookingServiceId: row.bookingServiceId,
          displayMode: row.displayMode,
          showPoster: row.showPoster,
          heading: row.heading ?? "",
          description: row.description ?? "",
          ctaLabel: row.ctaLabel ?? "",
          hasDatabaseRow: true,
          sourceHint: row.isEnabled ? "database" : "disabled",
          envFallbackSlug,
          warning,
          selectedSummary,
        };
      },
    );

    return {
      ok: true,
      data: {
        forms: forms.map((form) => ({
          id: form.id,
          slug: form.slug,
          title: form.title,
          purposeLabel: getFormPurposeLabel(form.purpose),
        })),
        bookingServices,
        placements,
      },
    };
  } catch {
    return { ok: false, reason: "unavailable" };
  }
}
