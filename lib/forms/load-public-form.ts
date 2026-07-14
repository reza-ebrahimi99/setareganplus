import {
  FormVersionStatus,
  type FormPurpose,
  type FormFieldType,
} from "@/generated/prisma/enums";
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
  fields: PublicFormField[];
};

export type LoadPublicFormResult =
  | { ok: true; data: PublicFormData }
  | { ok: false; reason: "not_found" | "unavailable" | "org_unavailable" };

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
      // Paused or never published — distinguishable from missing slug.
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
      },
    };
  } catch {
    return { ok: false, reason: "org_unavailable" };
  }
}
