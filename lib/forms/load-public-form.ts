import {
  FormVersionStatus,
  type FormPurpose,
  type FormFieldType,
} from "@/generated/prisma/enums";
import { countCapacityUsed } from "@/lib/forms/capacity";
import {
  evaluateFormAvailability,
  type FormAvailabilityStatus,
} from "@/lib/forms/evaluate-form-availability";
import { parseFormVersionSettings } from "@/lib/forms/form-version-settings";
import { publicUrlForStorageKey } from "@/lib/media/storage";
import { getCurrentOrganization } from "@/lib/organizations/get-current-organization";
import { prisma } from "@/lib/prisma";

export type PublicFormField = {
  id: string;
  fieldKey: string;
  sortOrder: number;
  type: FormFieldType;
  label: string;
  helpText: string | null;
  placeholder: string | null;
  required: boolean;
  config: unknown;
};

export type PublicFormPoster = {
  publicUrl: string;
  altText: string | null;
};

export type PublicFormData = {
  form: {
    id: string;
    slug: string;
    purpose: FormPurpose;
  };
  version: {
    id: string;
    title: string;
    description: string | null;
    confirmationMessage: string;
    versionNumber: number;
  };
  poster: PublicFormPoster | null;
  fields: PublicFormField[];
  availability: {
    status: FormAvailabilityStatus;
    remainingCapacity: number | null;
    showRemainingCapacity: boolean;
    message: string | null;
  };
};

export type LoadPublicFormResult =
  | { ok: true; data: PublicFormData }
  | {
      ok: false;
      reason:
        | "not_found"
        | "unavailable"
        | "org_unavailable"
        | "not_open_yet"
        | "closed"
        | "capacity_full";
      message?: string;
      meta?: {
        title?: string;
        purpose?: FormPurpose;
        poster?: PublicFormPoster | null;
      };
    };

/**
 * Loads only the Form.publishedVersionId version for a public slug.
 * Never falls back to latest / draft / paused / superseded / archived.
 */
export async function loadPublicFormBySlug(
  slug: string,
): Promise<LoadPublicFormResult> {
  try {
    const organization = await getCurrentOrganization();

    const form = await prisma.form.findFirst({
      where: {
        organizationId: organization.id,
        slug,
        deletedAt: null,
      },
      select: {
        id: true,
        slug: true,
        purpose: true,
        publishedVersionId: true,
      },
    });

    if (!form) {
      return { ok: false, reason: "not_found" };
    }

    if (!form.publishedVersionId) {
      return { ok: false, reason: "unavailable" };
    }

    const version = await prisma.formVersion.findFirst({
      where: {
        id: form.publishedVersionId,
        organizationId: organization.id,
        formId: form.id,
        status: FormVersionStatus.PUBLISHED,
      },
      select: {
        id: true,
        title: true,
        description: true,
        confirmationMessage: true,
        versionNumber: true,
        opensAt: true,
        registrationDeadline: true,
        capacity: true,
        settings: true,
        posterMedia: {
          select: {
            storageKey: true,
            altText: true,
            deletedAt: true,
          },
        },
        fields: {
          orderBy: { sortOrder: "asc" },
          select: {
            id: true,
            fieldKey: true,
            sortOrder: true,
            type: true,
            label: true,
            helpText: true,
            placeholder: true,
            required: true,
            config: true,
          },
        },
      },
    });

    if (!version) {
      return { ok: false, reason: "unavailable" };
    }

    const posterMedia = version.posterMedia;
    const poster =
      posterMedia && !posterMedia.deletedAt
        ? {
            publicUrl: publicUrlForStorageKey(posterMedia.storageKey),
            altText: posterMedia.altText,
          }
        : null;

    const usedCapacity = await countCapacityUsed({
      organizationId: organization.id,
      formId: form.id,
      formVersionId: version.id,
    });

    const settings = parseFormVersionSettings(version.settings);
    const availability = evaluateFormAvailability({
      isPublishedLive: true,
      opensAt: version.opensAt,
      registrationDeadline: version.registrationDeadline,
      capacity: version.capacity,
      usedCapacity,
    });

    const meta = {
      title: version.title,
      purpose: form.purpose,
      poster,
    };

    if (availability.status === "NOT_OPEN_YET") {
      return {
        ok: false,
        reason: "not_open_yet",
        message: availability.message ?? undefined,
        meta,
      };
    }

    if (availability.status === "CLOSED_BY_DEADLINE") {
      return {
        ok: false,
        reason: "closed",
        message: availability.message ?? undefined,
        meta,
      };
    }

    if (availability.status === "CAPACITY_FULL") {
      return {
        ok: false,
        reason: "capacity_full",
        message: availability.message ?? undefined,
        meta,
      };
    }

    if (availability.status !== "AVAILABLE") {
      return { ok: false, reason: "unavailable", message: availability.message ?? undefined };
    }

    return {
      ok: true,
      data: {
        form: {
          id: form.id,
          slug: form.slug,
          purpose: form.purpose,
        },
        version: {
          id: version.id,
          title: version.title,
          description: version.description,
          confirmationMessage: version.confirmationMessage,
          versionNumber: version.versionNumber,
        },
        poster,
        fields: version.fields.map((field) => ({
          id: field.id,
          fieldKey: field.fieldKey,
          sortOrder: field.sortOrder,
          type: field.type,
          label: field.label,
          helpText: field.helpText,
          placeholder: field.placeholder,
          required: field.required,
          config: field.config,
        })),
        availability: {
          status: availability.status,
          remainingCapacity: availability.remainingCapacity,
          showRemainingCapacity: settings.showRemainingCapacity,
          message: availability.message,
        },
      },
    };
  } catch {
    return { ok: false, reason: "org_unavailable" };
  }
}
