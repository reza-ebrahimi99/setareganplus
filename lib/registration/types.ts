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
  /** Base amount in Rials before package/discount. */
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
  /** Uppercase discount code → amount off in Rials. */
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
  flowKey: RegistrationFlowKey;
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
  studentFullName: string;
  productTitle: string;
  sessionTitle: string | null;
  packageTitle: string | null;
  venueBranchTitle: string | null;
  amountRials: number;
  discountRials: number;
  finalAmountRials: number;
  trackingCode: string | null;
  createdAt: Date;
  paymentMessage: string | null;
};

export const REGISTRATION_STATUS_LABELS: Record<RegistrationStatus, string> = {
  DRAFT: "پیش‌نویس",
  PENDING_PAYMENT: "در انتظار پرداخت",
  PAID: "پرداخت‌شده",
  COMPLETED: "تکمیل‌شده",
  CANCELLED: "لغو شده",
};

export const PARENT_RELATIONSHIP_LABELS: Record<
  RegistrationParentRelationship,
  string
> = {
  FATHER: "پدر",
  MOTHER: "مادر",
  GUARDIAN: "سرپرست",
  OTHER: "سایر",
};
