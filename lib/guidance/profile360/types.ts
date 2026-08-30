/**
 * Student 360° Profile — presentation contracts.
 * Digital identity for Guidance ERP. No JSX. Future AI fills reserved slots.
 */

import type { PortalIconName } from "@/components/portal/icons";
import type { PortalAccentId } from "@/components/portal/theme/types";

export const STUDENT_PROFILE_SECTION_IDS = [
  "personal",
  "academic",
  "family",
  "educational_goals",
  "university_preferences",
  "study_habits",
  "strengths",
  "weaknesses",
  "learning_challenges",
  "achievements",
  "languages",
  "skills",
  "extracurricular",
  "future_documents",
  "emergency_contacts",
] as const;

export type StudentProfileSectionId =
  (typeof STUDENT_PROFILE_SECTION_IDS)[number];

export type StudentProfileFieldType =
  | "text"
  | "textarea"
  | "tel"
  | "date"
  | "select"
  | "tags";

export type StudentProfileFieldDef = {
  id: string;
  label: string;
  type: StudentProfileFieldType;
  required?: boolean;
  placeholder?: string;
  options?: readonly { id: string; label: string }[];
  /** Architecture: future document upload slot */
  documentSlot?: boolean;
};

export type StudentProfileSectionDef = {
  id: StudentProfileSectionId;
  title: string;
  description: string;
  icon: PortalIconName;
  accent: PortalAccentId;
  fields: readonly StudentProfileFieldDef[];
  /** Future-only section — show premium empty architecture */
  architectureOnly?: boolean;
};

export type StudentProfileFieldValue = string | string[];

export type StudentProfileSectionValues = Record<string, StudentProfileFieldValue>;

export type StudentProfileData = Partial<
  Record<StudentProfileSectionId, StudentProfileSectionValues>
>;

export type StudentProfileHealth =
  | "excellent"
  | "good"
  | "incomplete"
  | "critical";

export type StudentProfileSessionStatus =
  | "not_started"
  | "in_progress"
  | "completed";

export type StudentProfileChangeItem = {
  id: string;
  sectionId: StudentProfileSectionId;
  sectionTitle: string;
  summary: string;
  atIso: string;
};

export type StudentProfileSessionRecord = {
  planId: string;
  planPublicId: string;
  status: StudentProfileSessionStatus;
  data: StudentProfileData;
  recentChanges: readonly StudentProfileChangeItem[];
  startedAtIso: string | null;
  updatedAtIso: string | null;
  completedAtIso: string | null;
  mediaAssetId: string | null;
};

export type StudentProfileSectionModel = {
  id: StudentProfileSectionId;
  title: string;
  description: string;
  icon: PortalIconName;
  accent: PortalAccentId;
  fields: readonly StudentProfileFieldDef[];
  values: StudentProfileSectionValues;
  filledCount: number;
  totalCount: number;
  requiredMissing: readonly string[];
  percent: number;
  state: "empty" | "partial" | "complete" | "architecture";
  architectureOnly?: boolean;
};

export type StudentProfileMissingCard = {
  id: string;
  sectionId: StudentProfileSectionId;
  title: string;
  description: string;
  ctaLabel: string;
  href: string;
  accent: PortalAccentId;
  icon: PortalIconName;
};

export type StudentProfileActionCard = {
  id: string;
  title: string;
  description: string;
  href: string;
  label: string;
  accent: PortalAccentId;
  icon: PortalIconName;
};

export type StudentProfileWidgetModel = {
  title: string;
  status: StudentProfileSessionStatus;
  statusLabel: string;
  health: StudentProfileHealth;
  healthLabel: string;
  progressPercent: number;
  completionLabel: string;
  description: string;
  cta: { href: string; label: string } | null;
  accent: PortalAccentId;
  icon: PortalIconName;
};

export type StudentProfileAiSlot =
  | "career_advisor"
  | "university_matching"
  | "scholarship_matching"
  | "counselor_insights"
  | "academic_risk";

/**
 * Primary presentation model for Student 360° Profile.
 */
export type StudentProfilePresentationModel = {
  planPublicId: string;
  studentName: string;
  portraitUrl: string | null;
  session: StudentProfileSessionRecord;
  health: StudentProfileHealth;
  healthLabel: string;
  completionPercent: number;
  filledSections: number;
  totalSections: number;
  sections: readonly StudentProfileSectionModel[];
  missing: readonly StudentProfileMissingCard[];
  recommendedActions: readonly StudentProfileActionCard[];
  recentChanges: readonly StudentProfileChangeItem[];
  widgets: {
    completion: StudentProfileWidgetModel;
    recentChanges: {
      title: string;
      items: readonly StudentProfileChangeItem[];
      emptyTitle: string;
      emptyDescription: string;
    };
    missing: {
      title: string;
      items: readonly StudentProfileMissingCard[];
      emptyTitle: string;
      emptyDescription: string;
    };
    recommendedActions: {
      title: string;
      items: readonly StudentProfileActionCard[];
    };
    quickEdit: {
      title: string;
      sections: readonly {
        id: StudentProfileSectionId;
        title: string;
        href: string;
        icon: PortalIconName;
      }[];
    };
  };
  hero: {
    eyebrow: string;
    headline: string;
    support: string;
    accent: PortalAccentId;
    icon: PortalIconName;
    statusLabel: string;
  };
  returnHref: string;
  futureAiSlots: readonly StudentProfileAiSlot[];
};
