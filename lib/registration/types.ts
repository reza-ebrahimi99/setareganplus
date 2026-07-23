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
  birthDate: JalaliDate | null;
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
    birthDate: JalaliDate;
    gender: Gender;
    gradeLabel: string;
    majorLabel?: string | null;
    schoolName: string;
    province: string;
    city: string;
  };
  parent: {
    parentName: string;
    relationship: RegistrationParentRelationship;
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
