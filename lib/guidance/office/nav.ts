/**
 * Student office rail — rooms of the department.
 * Slice 3: Home + Journey Tracker are live. Other rooms stay on the
 * student's path (never «به‌زودی»).
 */

export const MAJOR_OFFICE_HOME = "/ms";
export const MAJOR_OFFICE_JOURNEY = "/ms/journey";
export const MAJOR_OFFICE_INTEREST = "/ms/interest";
export const MAJOR_OFFICE_INTEREST_RESULTS = "/ms/interest/results";
export const DISCOVER_CENTER_HOME = "/discover";
export const DISCOVER_CENTER_SYSTEMS = "/discover/systems";
export const DISCOVER_CENTER_MAJORS = "/discover/majors";
export const DISCOVER_CENTER_PATHWAYS = "/discover/pathways";
export const MAJOR_OFFICE_SESSION = "/ms/session";
export {
  MAJOR_OFFICE_IDENTITY,
  MAJOR_OFFICE_ACADEMIC,
  MAJOR_OFFICE_GRADES,
  MAJOR_OFFICE_TRANSCRIPT,
} from "@/lib/guidance/office/intake-href";

export type OfficeRailItem = {
  id: string;
  label: string;
  href: string | null;
  live: boolean;
  lockReason: string | null;
};

export type OfficeRailSection = {
  id: string;
  label: string;
  items: readonly OfficeRailItem[];
};

export type OfficeRailPlanHint = {
  currentStep: number;
  completedSteps: readonly number[];
  finalApproved: boolean;
} | null;

type UnlockRule =
  | { kind: "path" }
  | { kind: "step_reached"; step: number }
  | { kind: "step_completed"; step: number }
  | { kind: "final_approved" };

type OfficeRailItemDef = {
  id: string;
  label: string;
  href: string | null;
  live: boolean;
  unlock: UnlockRule;
  lockReasonBefore: string | null;
  lockReasonReached: string | null;
};

type OfficeRailSectionDef = {
  id: string;
  label: string;
  items: readonly OfficeRailItemDef[];
};

const OFFICE_RAIL_DEFS: readonly OfficeRailSectionDef[] = [
  {
    id: "office",
    label: "دفتر",
    items: [
      {
        id: "home",
        label: "خانه",
        href: MAJOR_OFFICE_HOME,
        live: true,
        unlock: { kind: "path" },
        lockReasonBefore: null,
        lockReasonReached: null,
      },
      {
        id: "journey",
        label: "نقشه مسیر",
        href: MAJOR_OFFICE_JOURNEY,
        live: true,
        unlock: { kind: "path" },
        lockReasonBefore: null,
        lockReasonReached: null,
      },
      {
        id: "session",
        label: "جلسه اول",
        href: MAJOR_OFFICE_SESSION,
        live: true,
        unlock: { kind: "path" },
        lockReasonBefore: null,
        lockReasonReached: null,
      },
      {
        id: "timeline",
        label: "خط زمان",
        href: null,
        live: false,
        unlock: { kind: "path" },
        lockReasonBefore: "خط زمان پرونده را از نقشه مسیر دنبال کنید",
        lockReasonReached: "خط زمان پرونده را از نقشه مسیر دنبال کنید",
      },
    ],
  },
  {
    id: "file",
    label: "پرونده",
    items: [
      {
        id: "profile",
        label: "شناسنامه",
        href: "/ms/identity",
        live: true,
        unlock: { kind: "path" },
        lockReasonBefore: null,
        lockReasonReached: null,
      },
      {
        id: "academic",
        label: "پرونده تحصیلی",
        href: "/ms/academic",
        live: true,
        unlock: { kind: "path" },
        lockReasonBefore: null,
        lockReasonReached: null,
      },
      {
        id: "grades",
        label: "نمرات نهایی",
        href: "/ms/grades",
        live: true,
        unlock: { kind: "path" },
        lockReasonBefore: null,
        lockReasonReached: null,
      },
      {
        id: "transcript",
        label: "کارنامه PDF",
        href: "/ms/transcript",
        live: true,
        unlock: { kind: "path" },
        lockReasonBefore: null,
        lockReasonReached: null,
      },
      {
        id: "konkur",
        label: "نتایج کنکور",
        href: null,
        live: false,
        unlock: { kind: "step_reached", step: 5 },
        lockReasonBefore: "پس از تکمیل این مرحله فعال می‌شود",
        lockReasonReached: "نتایج کنکور را از مرحله کارنامه سنجش در نقشه مسیر ببینید",
      },
      {
        id: "documents",
        label: "مدارک",
        href: "/ms/transcript",
        live: true,
        unlock: { kind: "path" },
        lockReasonBefore: null,
        lockReasonReached: null,
      },
    ],
  },
  {
    id: "discover",
    label: "کشف",
    items: [
      {
        id: "interest",
        label: "آزمون رغبت",
        href: MAJOR_OFFICE_INTEREST,
        live: true,
        unlock: { kind: "path" },
        lockReasonBefore: null,
        lockReasonReached: null,
      },
      {
        id: "universities",
        label: "دانشنامه دانشگاه",
        href: DISCOVER_CENTER_SYSTEMS,
        live: true,
        unlock: { kind: "path" },
        lockReasonBefore: null,
        lockReasonReached: null,
      },
      {
        id: "majors",
        label: "دانشنامه رشته",
        href: DISCOVER_CENTER_MAJORS,
        live: true,
        unlock: { kind: "path" },
        lockReasonBefore: null,
        lockReasonReached: null,
      },
      {
        id: "systems",
        label: "نظام‌های آموزشی",
        href: DISCOVER_CENTER_PATHWAYS,
        live: true,
        unlock: { kind: "path" },
        lockReasonBefore: null,
        lockReasonReached: null,
      },
    ],
  },
  {
    id: "list",
    label: "فهرست ۱۵۰",
    items: [
      {
        id: "draft",
        label: "پیش‌نویس مشاور",
        href: null,
        live: false,
        unlock: { kind: "step_reached", step: 10 },
        lockReasonBefore: "پس از تکمیل اولویت‌ها و چیدمان فعال می‌شود",
        lockReasonReached: "پیش‌نویس فهرست را از مرحله چیدمان هوشمند در نقشه مسیر ببینید",
      },
      {
        id: "reports",
        label: "گزارش‌ها",
        href: null,
        live: false,
        unlock: { kind: "final_approved" },
        lockReasonBefore: "پس از تأیید نهایی در دسترس قرار می‌گیرد",
        lockReasonReached: "گزارش نهایی پس از بایگانی پرونده در همین دفتر می‌ماند",
      },
    ],
  },
];

export function isOfficeStepReached(
  step: number,
  plan: NonNullable<OfficeRailPlanHint>,
): boolean {
  return plan.currentStep >= step || plan.completedSteps.includes(step);
}

export function isOfficeStepCompleted(
  step: number,
  plan: NonNullable<OfficeRailPlanHint>,
): boolean {
  return plan.completedSteps.includes(step) || (plan.finalApproved && step <= 12);
}

function ruleReached(rule: UnlockRule, plan: OfficeRailPlanHint): boolean {
  if (!plan) return false;
  switch (rule.kind) {
    case "path":
      return true;
    case "step_reached":
      return isOfficeStepReached(rule.step, plan);
    case "step_completed":
      return isOfficeStepCompleted(rule.step, plan);
    case "final_approved":
      return plan.finalApproved;
  }
}

export function resolveOfficeRailSections(
  plan: OfficeRailPlanHint,
): OfficeRailSection[] {
  return OFFICE_RAIL_DEFS.map((section) => ({
    id: section.id,
    label: section.label,
    items: section.items.map((item) => {
      if (item.live) {
        return {
          id: item.id,
          label: item.label,
          href: item.href,
          live: true,
          lockReason: null,
        };
      }
      const reached = ruleReached(item.unlock, plan);
      return {
        id: item.id,
        label: item.label,
        href: null,
        live: false,
        lockReason: reached
          ? (item.lockReasonReached ?? item.lockReasonBefore)
          : item.lockReasonBefore,
      };
    }),
  }));
}

/** Default rail (no plan yet) — still journey-tied, never «به‌زودی». */
export const OFFICE_RAIL_SECTIONS: readonly OfficeRailSection[] =
  resolveOfficeRailSections(null);
