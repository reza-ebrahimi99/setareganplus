import { FormMode, FormVersionStatus } from "@/generated/prisma/enums";
import { getAdminSession } from "@/lib/auth/require-admin";
import { hasPermission } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma";

export type EditableDraftContext = {
  organizationId: string;
  formId: string;
  formVersionId: string;
};

export type ResolveEditableDraftResult =
  | { ok: true; context: EditableDraftContext }
  | { ok: false; formError: string };

/**
 * Resolves the editable DRAFT FormVersion for Registration Step Builder mutations.
 * Enforces staff session + forms.manage + tenant ownership + Form.mode = REGISTRATION.
 */
export async function resolveEditableDraft(
  formId: string,
): Promise<ResolveEditableDraftResult> {
  const session = await getAdminSession();
  if (!session || !hasPermission(session, "forms.manage")) {
    return {
      ok: false,
      formError: "نشست مدیریت معتبر نیست. دوباره وارد شوید.",
    };
  }

  const organizationId = session.organization.id;
  const trimmedFormId = formId.trim();
  if (!trimmedFormId) {
    return { ok: false, formError: "شناسه فرم نامعتبر است." };
  }

  const form = await prisma.form.findFirst({
    where: {
      id: trimmedFormId,
      organizationId,
      deletedAt: null,
    },
    select: { id: true, mode: true },
  });

  if (!form) {
    return { ok: false, formError: "فرم مورد نظر یافت نشد." };
  }

  if (form.mode !== FormMode.REGISTRATION) {
    return {
      ok: false,
      formError:
        "عملیات مراحل فقط برای فرم‌های حالت «ثبت‌نام» مجاز است. این فرم در حالت استاندارد است.",
    };
  }

  const draft = await prisma.formVersion.findFirst({
    where: {
      organizationId,
      formId: form.id,
      status: FormVersionStatus.DRAFT,
    },
    orderBy: { versionNumber: "desc" },
    select: { id: true },
  });

  if (!draft) {
    return {
      ok: false,
      formError:
        "نسخه پیش‌نویس قابل ویرایش برای این فرم وجود ندارد. فقط نسخه‌های پیش‌نویس قابل ویرایش هستند.",
    };
  }

  return {
    ok: true,
    context: {
      organizationId,
      formId: form.id,
      formVersionId: draft.id,
    },
  };
}
