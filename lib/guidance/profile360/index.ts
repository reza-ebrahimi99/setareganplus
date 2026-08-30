export type {
  StudentProfileActionCard,
  StudentProfileAiSlot,
  StudentProfileChangeItem,
  StudentProfileData,
  StudentProfileFieldDef,
  StudentProfileFieldType,
  StudentProfileFieldValue,
  StudentProfileHealth,
  StudentProfileMissingCard,
  StudentProfilePresentationModel,
  StudentProfileSectionDef,
  StudentProfileSectionId,
  StudentProfileSectionModel,
  StudentProfileSectionValues,
  StudentProfileSessionRecord,
  StudentProfileSessionStatus,
  StudentProfileWidgetModel,
} from "@/lib/guidance/profile360/types";

export { STUDENT_PROFILE_SECTION_IDS } from "@/lib/guidance/profile360/types";

export {
  STUDENT_PROFILE_SECTIONS,
  getProfileSectionDef,
} from "@/lib/guidance/profile360/sections";

export {
  buildStudentProfileDashboardWidget,
  buildStudentProfilePresentationModel,
  computeProfileCompletionPercent,
  computeProfileHealth,
  isProfile360JourneyComplete,
  profileHealthLabel,
} from "@/lib/guidance/profile360/presentation";

export {
  loadGuidanceProfile360Session,
  saveGuidanceProfile360Session,
  PROFILE360_SESSION_CATEGORY,
  PROFILE360_SESSION_KIND,
  type SaveProfile360Input,
} from "@/lib/guidance/profile360/session";
