import { Prisma } from "@/generated/prisma/client";
import { FormVersionStatus } from "@/generated/prisma/enums";
import { validateFormVersionForPublish } from "@/lib/forms/validate-form-for-publish";
import { prisma } from "@/lib/prisma";

export type PublishFormDraftResult =
  | {
      ok: true;
      formId: string;
      slug: string;
      publishedVersionId: string;
      freshDraftVersionId: string;
      freshDraftVersionNumber: number;
    }
  | {
      ok: false;
      reason:
        | "form_not_found"
        | "draft_not_found"
        | "validation_failed"
        | "conflict";
      errors?: string[];
    };

type PublishFormDraftParams = {
  organizationId: string;
  formId: string;
  expectedDraftVersionId: string;
  actorUserId: string;
};

class PublishConflictError extends Error {
  constructor() {
    super("FORM_PUBLISH_CONFLICT");
    this.name = "PublishConflictError";
  }
}

function asRequiredInputJson(
  value: Prisma.JsonValue,
): Prisma.InputJsonValue | typeof Prisma.JsonNull {
  return value === null
    ? Prisma.JsonNull
    : (value as Prisma.InputJsonValue);
}

function asNullableInputJson(
  value: Prisma.JsonValue | null,
): Prisma.InputJsonValue | typeof Prisma.DbNull {
  return value === null
    ? Prisma.DbNull
    : (value as Prisma.InputJsonValue);
}

/**
 * Publishes the exact submitted draft and creates its editable successor atomically.
 * Public readers continue to use only Form.publishedVersionId.
 */
export async function publishFormDraft(
  params: PublishFormDraftParams,
): Promise<PublishFormDraftResult> {
  try {
    return await prisma.$transaction(
      async (tx) => {
          const form = await tx.form.findFirst({
            where: {
              id: params.formId,
              organizationId: params.organizationId,
              deletedAt: null,
            },
            select: {
              id: true,
              slug: true,
            },
          });

          if (!form) {
            return { ok: false, reason: "form_not_found" } as const;
          }

          const draft = await tx.formVersion.findFirst({
            where: {
              id: params.expectedDraftVersionId,
              organizationId: params.organizationId,
              formId: form.id,
              status: FormVersionStatus.DRAFT,
            },
            orderBy: { versionNumber: "desc" },
            select: {
              id: true,
              versionNumber: true,
              title: true,
              description: true,
              opensAt: true,
              registrationDeadline: true,
              capacity: true,
              confirmationMessage: true,
              duplicatePolicy: true,
              createLeadOnSubmit: true,
              leadSource: true,
              showBranchPicker: true,
              settings: true,
              sourceTemplateId: true,
              posterMediaId: true,
              fields: {
                orderBy: { sortOrder: "asc" },
                select: {
                  fieldKey: true,
                  sortOrder: true,
                  type: true,
                  semantic: true,
                  label: true,
                  helpText: true,
                  placeholder: true,
                  required: true,
                  config: true,
                  visibilityConditions: true,
                },
              },
            },
          });

          if (!draft) {
            return { ok: false, reason: "draft_not_found" } as const;
          }

          const validation = validateFormVersionForPublish({
            slug: form.slug,
            title: draft.title,
            confirmationMessage: draft.confirmationMessage,
            opensAt: draft.opensAt,
            registrationDeadline: draft.registrationDeadline,
            capacity: draft.capacity,
            settings: draft.settings,
            fields: draft.fields,
          });

          if (!validation.ok) {
            return {
              ok: false,
              reason: "validation_failed",
              errors: validation.errors,
            } as const;
          }

          const versionAggregate = await tx.formVersion.aggregate({
            where: {
              organizationId: params.organizationId,
              formId: form.id,
            },
            _max: { versionNumber: true },
          });
          const freshDraftVersionNumber =
            (versionAggregate._max.versionNumber ?? draft.versionNumber) + 1;
          const publishedAt = new Date();

          const claimedDraft = await tx.formVersion.updateMany({
            where: {
              id: draft.id,
              organizationId: params.organizationId,
              formId: form.id,
              status: FormVersionStatus.DRAFT,
            },
            data: {
              status: FormVersionStatus.PUBLISHED,
              publishedAt,
              pausedAt: null,
              archivedAt: null,
            },
          });

          if (claimedDraft.count !== 1) {
            throw new PublishConflictError();
          }

          await tx.formVersion.updateMany({
            where: {
              organizationId: params.organizationId,
              formId: form.id,
              status: FormVersionStatus.PUBLISHED,
              NOT: { id: draft.id },
            },
            data: {
              status: FormVersionStatus.SUPERSEDED,
            },
          });

          await tx.form.update({
            where: {
              organizationId_id: {
                organizationId: params.organizationId,
                id: form.id,
              },
            },
            data: {
              publishedVersionId: draft.id,
            },
          });

          const freshDraft = await tx.formVersion.create({
            data: {
              organizationId: params.organizationId,
              formId: form.id,
              versionNumber: freshDraftVersionNumber,
              status: FormVersionStatus.DRAFT,
              title: draft.title,
              description: draft.description,
              opensAt: draft.opensAt,
              registrationDeadline: draft.registrationDeadline,
              capacity: draft.capacity,
              confirmationMessage: draft.confirmationMessage,
              duplicatePolicy: draft.duplicatePolicy,
              createLeadOnSubmit: draft.createLeadOnSubmit,
              leadSource: draft.leadSource,
              showBranchPicker: draft.showBranchPicker,
              settings: asRequiredInputJson(draft.settings),
              sourceTemplateId: draft.sourceTemplateId,
              posterMediaId: draft.posterMediaId,
              createdByUserId: params.actorUserId,
            },
            select: { id: true },
          });

          if (draft.fields.length > 0) {
            await tx.formField.createMany({
              data: draft.fields.map((field) => ({
                organizationId: params.organizationId,
                formVersionId: freshDraft.id,
                fieldKey: field.fieldKey,
                sortOrder: field.sortOrder,
                type: field.type,
                semantic: field.semantic,
                label: field.label,
                helpText: field.helpText,
                placeholder: field.placeholder,
                required: field.required,
                config: asRequiredInputJson(field.config),
                visibilityConditions: asNullableInputJson(
                  field.visibilityConditions,
                ),
              })),
            });
          }

          return {
            ok: true,
            formId: form.id,
            slug: form.slug,
            publishedVersionId: draft.id,
            freshDraftVersionId: freshDraft.id,
            freshDraftVersionNumber,
          } as const;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  } catch (error) {
    const isConflict =
      error instanceof PublishConflictError ||
      (error instanceof Prisma.PrismaClientKnownRequestError &&
        (error.code === "P2002" || error.code === "P2034"));

    if (isConflict) {
      return { ok: false, reason: "conflict" };
    }

    throw error;
  }
}
