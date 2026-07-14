import {
  FormVersionStatus,
  type FormPurpose,
  type FormFieldType,
} from "@/generated/prisma/enums";
import { getAdminSession } from "@/lib/auth/require-admin";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export type EditorField = {
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

export type EditorDisplayStatus = "DRAFT" | "PUBLISHED" | "PAUSED";

export type FormEditorData = {
  form: {
    id: string;
    slug: string;
    purpose: FormPurpose;
    publishedVersionId: string | null;
  };
  draft: {
    id: string;
    versionNumber: number;
    title: string;
    confirmationMessage: string;
    status: typeof FormVersionStatus.DRAFT;
  } | null;
  publishedVersion: {
    id: string;
    versionNumber: number;
    title: string;
    publishedAt: Date | null;
  } | null;
  fields: EditorField[];
  displayStatus: EditorDisplayStatus;
  headerTitle: string;
};

export type LoadFormEditorResult =
  | { ok: true; data: FormEditorData }
  | { ok: false; reason: "not_found" | "unavailable" };

/**
 * Loads an org-scoped form for the admin editor.
 * Prefer latest DRAFT for field editing; also load published pointer for publish/pause UI.
 * Never queries Form by id alone.
 */
export async function loadFormEditor(
  formId: string,
): Promise<LoadFormEditorResult> {
  const session = await getAdminSession();
  if (!session) {
    redirect("/admin/login");
  }
  const organization = session.organization;

  try {
    const form = await prisma.form.findFirst({
      where: {
        id: formId,
        organizationId: organization.id,
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

    const draft = await prisma.formVersion.findFirst({
      where: {
        organizationId: organization.id,
        formId: form.id,
        status: FormVersionStatus.DRAFT,
      },
      orderBy: {
        versionNumber: "desc",
      },
      select: {
        id: true,
        versionNumber: true,
        title: true,
        confirmationMessage: true,
        status: true,
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

    let publishedVersion: FormEditorData["publishedVersion"] = null;

    if (form.publishedVersionId) {
      const version = await prisma.formVersion.findFirst({
        where: {
          id: form.publishedVersionId,
          organizationId: organization.id,
          formId: form.id,
          status: FormVersionStatus.PUBLISHED,
        },
        select: {
          id: true,
          versionNumber: true,
          title: true,
          publishedAt: true,
        },
      });

      if (version) {
        publishedVersion = version;
      }
    }

    let displayStatus: EditorDisplayStatus;
    if (form.publishedVersionId && publishedVersion) {
      displayStatus = "PUBLISHED";
    } else if (draft) {
      displayStatus = "DRAFT";
    } else {
      const paused = await prisma.formVersion.findFirst({
        where: {
          organizationId: organization.id,
          formId: form.id,
          status: FormVersionStatus.PAUSED,
        },
        orderBy: { versionNumber: "desc" },
        select: { id: true, title: true, versionNumber: true },
      });

      displayStatus = paused ? "PAUSED" : "DRAFT";
    }

    const headerTitle =
      draft?.title ??
      publishedVersion?.title ??
      "فرم بدون عنوان";

    return {
      ok: true,
      data: {
        form: {
          id: form.id,
          slug: form.slug,
          purpose: form.purpose,
          publishedVersionId: form.publishedVersionId,
        },
        draft: draft
          ? {
              id: draft.id,
              versionNumber: draft.versionNumber,
              title: draft.title,
              confirmationMessage: draft.confirmationMessage,
              status: FormVersionStatus.DRAFT,
            }
          : null,
        publishedVersion,
        fields: (draft?.fields ?? []).map((field) => ({
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
        displayStatus,
        headerTitle,
      },
    };
  } catch {
    return { ok: false, reason: "unavailable" };
  }
}
