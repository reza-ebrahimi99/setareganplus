import type {
  GuardianRelationshipType,
  PortalAccountType,
  SystemRole,
} from "@/generated/prisma/client";

export type PortalSessionUser = {
  id: string;
  mobile: string | null;
  firstName: string;
  lastName: string;
  displayName: string;
};

export type PortalOrganization = {
  id: string;
  slug: string;
  name: string;
};

export type PortalAccountLinkSummary = {
  id: string;
  accountType: PortalAccountType;
  studentId: string | null;
  guardianId: string | null;
  label: string;
  organizationId: string;
};

export type AuthorizedStudentContext = {
  studentId: string;
  studentName: string;
  studentSlug: string;
  gradeName: string;
  schoolYear: string | null;
  portraitUrl: string | null;
  source: "STUDENT_LINK" | "GUARDIAN_RELATION";
  canViewAcademicData: boolean;
  canViewAchievements: boolean;
  canViewCertificates: boolean;
  relationshipType: GuardianRelationshipType | null;
};

/**
 * Trusted server-side portal context.
 * Never construct from client-provided organizationId / studentId.
 */
export type PortalContext = {
  user: PortalSessionUser;
  organization: PortalOrganization;
  membershipId: string;
  membershipRole: SystemRole;
  sessionId: string;
  links: PortalAccountLinkSummary[];
  activeLink: PortalAccountLinkSummary;
  authorizedStudents: AuthorizedStudentContext[];
};
