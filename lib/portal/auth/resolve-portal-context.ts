import {
  MembershipStatus,
  PortalAccountType,
  SystemRole,
  UserStatus,
} from "@/generated/prisma/enums";
import { hashSessionToken } from "@/lib/auth/crypto";
import { prisma } from "@/lib/prisma";
import { logServerWarn } from "@/lib/observability/server-log";
import {
  readActivePortalLinkCookie,
  readPortalSessionToken,
} from "@/lib/portal/auth/session";
import type {
  AuthorizedStudentContext,
  PortalAccountLinkSummary,
  PortalContext,
} from "@/lib/portal/auth/types";
import { publicStudentPortraitUrl } from "@/lib/media/student-portrait";

function displayName(firstName: string, lastName: string): string {
  return `${firstName} ${lastName}`.trim();
}

async function loadAuthorizedStudentsForLink(params: {
  organizationId: string;
  accountType: PortalAccountType;
  studentId: string | null;
  guardianId: string | null;
}): Promise<AuthorizedStudentContext[]> {
  if (
    params.accountType === PortalAccountType.STUDENT &&
    params.studentId
  ) {
    const student = await prisma.student.findFirst({
      where: {
        id: params.studentId,
        organizationId: params.organizationId,
        deletedAt: null,
        archivedAt: null,
        isActive: true,
      },
      select: {
        id: true,
        fullName: true,
        slug: true,
        schoolYear: true,
        grade: { select: { name: true } },
        portraitMedia: {
          select: { storageKey: true, metadata: true, altText: true },
        },
      },
    });
    if (!student) return [];
    return [
      {
        studentId: student.id,
        studentName: student.fullName,
        studentSlug: student.slug,
        gradeName: student.grade.name,
        schoolYear: student.schoolYear,
        portraitUrl: publicStudentPortraitUrl(student.portraitMedia, "w480"),
        source: "STUDENT_LINK",
        canViewAcademicData: true,
        canViewAchievements: true,
        canViewCertificates: true,
        relationshipType: null,
      },
    ];
  }

  if (
    params.accountType === PortalAccountType.GUARDIAN &&
    params.guardianId
  ) {
    const relations = await prisma.studentGuardianRelation.findMany({
      where: {
        organizationId: params.organizationId,
        guardianId: params.guardianId,
        deletedAt: null,
        guardian: {
          deletedAt: null,
          archivedAt: null,
          isActive: true,
        },
        student: {
          deletedAt: null,
          archivedAt: null,
          isActive: true,
        },
      },
      orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
      select: {
        relationshipType: true,
        canViewAcademicData: true,
        canViewAchievements: true,
        canViewCertificates: true,
        student: {
          select: {
            id: true,
            fullName: true,
            slug: true,
            schoolYear: true,
            grade: { select: { name: true } },
            portraitMedia: {
              select: { storageKey: true, metadata: true, altText: true },
            },
          },
        },
      },
    });

    return relations.map((relation) => ({
      studentId: relation.student.id,
      studentName: relation.student.fullName,
      studentSlug: relation.student.slug,
      gradeName: relation.student.grade.name,
      schoolYear: relation.student.schoolYear,
      portraitUrl: publicStudentPortraitUrl(
        relation.student.portraitMedia,
        "w480",
      ),
      source: "GUARDIAN_RELATION" as const,
      canViewAcademicData: relation.canViewAcademicData,
      canViewAchievements: relation.canViewAchievements,
      canViewCertificates: relation.canViewCertificates,
      relationshipType: relation.relationshipType,
    }));
  }

  return [];
}

/**
 * Resolve authenticated portal context from the portal session cookie.
 * Access is driven by active PortalAccountLink rows (DB), not stale token claims.
 */
export async function resolvePortalContext(): Promise<PortalContext | null> {
  const token = await readPortalSessionToken();
  if (!token) return null;

  const tokenHash = hashSessionToken(token);
  const now = new Date();

  const session = await prisma.adminSession.findFirst({
    where: {
      tokenHash,
      revokedAt: null,
      expiresAt: { gt: now },
      user: { deletedAt: null, status: UserStatus.ACTIVE },
    },
    select: {
      id: true,
      organizationMembershipId: true,
      user: {
        select: {
          id: true,
          mobile: true,
          firstName: true,
          lastName: true,
        },
      },
      membership: {
        select: {
          id: true,
          role: true,
          status: true,
          deletedAt: true,
          organization: {
            select: {
              id: true,
              slug: true,
              name: true,
              isActive: true,
              deletedAt: true,
            },
          },
        },
      },
    },
  });

  if (!session?.membership) return null;
  const membership = session.membership;
  if (
    membership.status !== MembershipStatus.ACTIVE ||
    membership.deletedAt ||
    !membership.organization.isActive ||
    membership.organization.deletedAt
  ) {
    return null;
  }

  const organizationId = membership.organization.id;

  const linkRows = await prisma.portalAccountLink.findMany({
    where: {
      organizationId,
      userId: session.user.id,
      deletedAt: null,
      isActive: true,
    },
    orderBy: [{ createdAt: "asc" }],
    select: {
      id: true,
      accountType: true,
      studentId: true,
      guardianId: true,
      organizationId: true,
      student: { select: { fullName: true } },
      guardian: { select: { fullName: true } },
    },
  });

  if (linkRows.length === 0) {
    logServerWarn({
      module: "portal.auth",
      action: "resolvePortalContext",
      category: "security",
      organizationId,
      userId: session.user.id,
      message: "portal_session_without_active_links",
    });
    return null;
  }

  const links: PortalAccountLinkSummary[] = linkRows.map((row) => ({
    id: row.id,
    accountType: row.accountType,
    studentId: row.studentId,
    guardianId: row.guardianId,
    organizationId: row.organizationId,
    label:
      row.accountType === PortalAccountType.STUDENT
        ? row.student?.fullName ?? "دانش‌آموز"
        : row.guardian?.fullName ?? "ولی",
  }));

  const preferredLinkId = await readActivePortalLinkCookie();
  const activeLink =
    links.find((link) => link.id === preferredLinkId) ?? links[0]!;

  const authorizedStudents = await loadAuthorizedStudentsForLink({
    organizationId,
    accountType: activeLink.accountType,
    studentId: activeLink.studentId,
    guardianId: activeLink.guardianId,
  });

  return {
    user: {
      id: session.user.id,
      mobile: session.user.mobile,
      firstName: session.user.firstName,
      lastName: session.user.lastName,
      displayName: displayName(session.user.firstName, session.user.lastName),
    },
    organization: {
      id: membership.organization.id,
      slug: membership.organization.slug,
      name: membership.organization.name,
    },
    membershipId: membership.id,
    membershipRole: membership.role as SystemRole,
    sessionId: session.id,
    links,
    activeLink,
    authorizedStudents,
  };
}
