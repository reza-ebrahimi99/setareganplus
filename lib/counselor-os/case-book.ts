/**
 * Complete case-book section checklist. Print UI reads these keys.
 */

export const CASE_BOOK_SECTION_KEYS = [
  "cover",
  "identity",
  "examGroups",
  "grades",
  "interest",
  "preferences",
  "payment",
  "documents",
  "session1",
  "konkur",
  "initialChoices",
  "studentReview",
  "session2",
  "finalRevision",
  "informed",
  "sanjesh",
  "followUps",
  "audit",
] as const;

export type CaseBookSectionKey = (typeof CASE_BOOK_SECTION_KEYS)[number];

export function caseBookSectionPresence(input: {
  hasIdentity: boolean;
  hasExamGroups: boolean;
  hasGrades: boolean;
  hasHolland: boolean;
  hasPreferences: boolean;
  hasPayment: boolean;
  hasDocuments: boolean;
  hasSession1: boolean;
  hasKonkur: boolean;
  hasInitialChoices: boolean;
  hasReview: boolean;
  hasSession2: boolean;
  hasFinal: boolean;
  hasInformed: boolean;
  hasSanjesh: boolean;
  hasFollowUps: boolean;
  hasAudit: boolean;
}): Record<CaseBookSectionKey, boolean> {
  return {
    cover: true,
    identity: input.hasIdentity,
    examGroups: input.hasExamGroups,
    grades: input.hasGrades,
    interest: input.hasHolland,
    preferences: input.hasPreferences,
    payment: input.hasPayment,
    documents: input.hasDocuments,
    session1: input.hasSession1,
    konkur: input.hasKonkur,
    initialChoices: input.hasInitialChoices,
    studentReview: input.hasReview,
    session2: input.hasSession2,
    finalRevision: input.hasFinal,
    informed: input.hasInformed,
    sanjesh: input.hasSanjesh,
    followUps: input.hasFollowUps,
    audit: input.hasAudit,
  };
}
