/**
 * Shared Registration Engine types (product-agnostic).
 */

import type {
  Gender,
  RegistrationParentRelationship,
  RegistrationProductType,
  RegistrationStatus,
} from "@/generated/prisma/enums";
import type { JalaliDate } from "@/lib/datetime/jalali";
import type { PreservedFieldValue } from "@/lib/forms/validate-public-submission";

export type RegistrationFlowKey = "qalamchi-exam" | (string & {});

export type RegistrationCatalogOption = {
  key: string;
  title: string;
  description?: string;
  amountRials?: number;
};

export type RegistrationCatalogPackage = RegistrationCatalogOption & {
  amountRials: number;
};

export type RegistrationFlowCatalog = {
  flowKey: RegistrationFlowKey;
  productType: RegistrationProductType;
  title: string;
  subtitle: string;
  products: RegistrationCatalogOption[];
  sessions: RegistrationCatalogOption[];
  packages: RegistrationCatalogPackage[];
  venueBranches: RegistrationCatalogOption[];
  discountCodes: Record<string, number>;
};

export type StudentStepInput = {
  firstName: string;
  lastName: string;
  nationalCode: string;
  /** Jalali select parts (string option values). Final date is built on validate/submit. */
  birthYear: string;
  birthMonth: string;
  birthDay: string;
  gender: Gender | "";
  gradeSlug: string;
  gradeLabel: string;
  majorSlug: string;
  majorLabel: string;
  schoolName: string;
  province: string;
  city: string;
};

export type ParentStepInput = {
  parentName: string;
  relationship: RegistrationParentRelationship | "";
  mobile: string;
  secondaryMobile: string;
  email: string;
  address: string;
};

export type DetailsStepInput = {
  productKey: string;
  sessionKey: string;
  packageKey: string;
  venueBranchKey: string;
  discountCode: string;
};

export type RegistrationWizardState = {
  student: StudentStepInput;
  parent: ParentStepInput;
  details: DetailsStepInput;
};

export type CreateRegistrationInput = {
  flowKey: string;
  resumeToken?: string | null;
  /** When flow paymentMode is OPTIONAL_PAYMENT, skip checkout and finalize as waived. */
  skipOptionalPayment?: boolean;
  student: {
    firstName: string;
    lastName: string;
    nationalCode: string;
    /** Optional when Form Builder supplies profile questions. */
    birthDate?: JalaliDate | null;
    gender?: Gender | null;
    gradeLabel?: string;
    majorLabel?: string | null;
    schoolName?: string;
    province?: string;
    city?: string;
  };
  parent: {
    parentName?: string;
    relationship?: RegistrationParentRelationship | null;
    mobile: string;
    secondaryMobile?: string | null;
    email?: string | null;
    address?: string | null;
  };
  details: {
    productKey: string;
    sessionKey: string;
    packageKey: string;
    venueBranchKey: string;
    discountCode?: string | null;
  };
  /** Custom Form Builder answers (non-system fields). */
  formAnswers?: Record<string, PreservedFieldValue | null>;
  linkedForm?: {
    formId: string;
    formVersionId: string;
  } | null;
  /** Optional explicit CRM lead id (e.g. staff-assisted registration). */
  leadId?: string | null;
  /** First-touch marketing attribution (UTM / referral / QR / manual). */
  attribution?: import("@/lib/registration/attribution").RegistrationAttribution | null;
  honeypot?: string;
};

export type RegistrationPublicView = {
  id: string;
  registrationNumber: string;
  status: RegistrationStatus;
  paymentStatus: import("@/generated/prisma/enums").RegistrationPaymentStatus;
  studentFullName: string;
  productTitle: string;
  sessionTitle: string | null;
  packageTitle: string | null;
  venueBranchTitle: string | null;
  amountRials: number;
  discountRials: number;
  finalAmountRials: number;
  publicTrackingCode: string | null;
  trackingCode: string | null;
  paymentReceiptNumber: string | null;
  paymentProvider: string | null;
  createdAt: Date;
  paymentMessage: string | null;
};

export {
  REGISTRATION_STATUS_LABELS,
  REGISTRATION_PAYMENT_LABELS,
  REGISTRATION_DOCUMENT_TYPE_LABELS,
  WIZARD_STEP_LABELS,
  WIZARD_TOTAL_STEPS,
} from "@/lib/registration/status";

export const PARENT_RELATIONSHIP_LABELS: Record<
  RegistrationParentRelationship,
  string
> = {
  FATHER: "پدر",
  MOTHER: "مادر",
  GUARDIAN: "سرپرست",
  OTHER: "سایر",
};
