import { redirect } from "next/navigation";
import { PortalAccountType } from "@/generated/prisma/enums";
import { logServerWarn } from "@/lib/observability/server-log";
import { resolvePortalContext } from "@/lib/portal/auth/resolve-portal-context";
import { PortalError } from "@/lib/portal/auth/errors";
import type { PortalContext } from "@/lib/portal/auth/types";

export async function requirePortalContext(): Promise<PortalContext> {
  const context = await resolvePortalContext();
  if (!context) {
    redirect("/portal/login");
  }
  return context;
}

export async function requireStudentPortalAccess(): Promise<PortalContext> {
  const context = await requirePortalContext();
  if (context.activeLink.accountType !== PortalAccountType.STUDENT) {
    redirect("/portal/select-account");
  }
  if (context.authorizedStudents.length === 0) {
    logServerWarn({
      module: "portal.auth",
      action: "requireStudentPortalAccess",
      category: "security",
      organizationId: context.organization.id,
      userId: context.user.id,
      recordId: context.activeLink.id,
      message: "student_link_without_authorized_student",
    });
    redirect("/portal/select-account");
  }
  return context;
}

/**
 * Ensure the active student context may view the given studentId.
 * Throws PortalError — never reveals whether other students exist.
 */
export function assertStudentVisible(
  context: PortalContext,
  studentId: string,
  options?: { requireAcademic?: boolean; requireAchievements?: boolean; requireCertificates?: boolean },
) {
  const match = context.authorizedStudents.find(
    (student) => student.studentId === studentId,
  );
  if (!match) {
    logServerWarn({
      module: "portal.auth",
      action: "assertStudentVisible",
      category: "security",
      organizationId: context.organization.id,
      userId: context.user.id,
      message: "student_access_denied",
      meta: { requested: "student" },
    });
    throw new PortalError(
      "STUDENT_ACCESS_DENIED",
      "دسترسی به این دانش‌آموز مجاز نیست.",
    );
  }
  if (options?.requireAcademic && !match.canViewAcademicData) {
    throw new PortalError(
      "RELATION_PERMISSION_DENIED",
      "مشاهده اطلاعات تحصیلی مجاز نیست.",
    );
  }
  if (options?.requireAchievements && !match.canViewAchievements) {
    throw new PortalError(
      "RELATION_PERMISSION_DENIED",
      "مشاهده افتخارات مجاز نیست.",
    );
  }
  if (options?.requireCertificates && !match.canViewCertificates) {
    throw new PortalError(
      "RELATION_PERMISSION_DENIED",
      "مشاهده گواهی‌ها مجاز نیست.",
    );
  }
  return match;
}
