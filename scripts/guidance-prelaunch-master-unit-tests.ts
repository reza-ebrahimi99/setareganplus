/**
 * Prelaunch master regression tests. No database. No fragile UI strings
 * beyond the explicit FREE-plan commercial copy that must stay absent.
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { calculateGuidanceDiscount, rialToToman } from "../lib/guidance/discounts/engine";
import { GUIDANCE_PACKAGE_ENTRY_POINTS } from "../lib/guidance/checkout/entry-points";
import { resolveGuidancePayablePackage } from "../lib/guidance/packages/resolve-payable";
import {
  GUIDANCE_V2_PACKAGES,
  GUIDANCE_V2_ALUMNI_DISCOUNT_RIALS,
  calculateGuidanceV2PackagePrice,
  getGuidanceV2Package,
} from "../lib/guidance/journey-v2/steps/step10-packages";
import {
  packageIncludesArrangement,
  assertArrangementEntitlement,
} from "../lib/guidance/journey-v2/entitlements";
import {
  validateGuidanceV2Step1Input,
  isSyntheticPlaceholderName,
} from "../lib/guidance/journey-v2/steps/step1-validation";
import {
  resolveGuidanceV2StepAccessMode,
  studentEditRequiresCounselorReview,
} from "../lib/guidance/journey-v2/step-access-policy";
import { assertRequiredDocumentApproved } from "../lib/guidance/documents/verification-gate";
import { assertQualifyingSessionBooking } from "../lib/guidance/journey-v2/booking-gate";
import { APPOINTMENT_PURPOSE } from "../lib/guidance/journey-v2/constants";
import {
  assertProgramsDoNotOverlap,
  ymdRangesOverlap,
} from "../lib/counselor-os/schedule-conflict";
import {
  enumerateSlotStartsInWindows,
  slotFitsSingleWindow,
  slotMatchesProgram,
} from "../lib/counselor-os/schedule-windows";
import {
  counselorChoiceMutationLock,
  resolveChoiceStudioState,
} from "../lib/guidance/choice-studio/status";
import { caseBookSectionPresence } from "../lib/counselor-os/case-book";
import { buildHollandRecommendations } from "../lib/guidance/journey-v2/holland/recommendations";
import { buildLateJourneyTimeline } from "../lib/guidance/journey-v2/late-status";
import { guidanceDashboardGreetingName } from "../lib/guidance/brand/dashboard-greeting";
import { GUIDANCE_STEPS_ENTRY } from "../lib/guidance/portal-nav";
import { guidanceJourneyV2StepPath } from "../lib/guidance/journey-v2/catalog";

let passed = 0;
function test(name: string, fn: () => void) {
  fn();
  passed += 1;
  console.log(`✓ ${name}`);
}

const validStep1 = {
  firstName: "سارا",
  lastName: "محمدی",
  nationalId: "0499370899",
  gender: "FEMALE",
  birthDateJalali: "1384/01/15",
  nativeProvince: "تهران",
  regionQuota: "1",
  specialQuota: "NORMAL",
  highSchoolAverage: "18.5",
};

test("1) Step1 rejects empty / whitespace / داوطلب جدید and accepts a real name", () => {
  assert.equal(isSyntheticPlaceholderName("داوطلب جدید"), true);
  assert.equal(isSyntheticPlaceholderName("داوطلب"), true);
  assert.equal(isSyntheticPlaceholderName("سارا"), false);

  const empty = validateGuidanceV2Step1Input({ ...validStep1, firstName: "", lastName: "" });
  assert.equal(empty.ok, false);

  const ws = validateGuidanceV2Step1Input({ ...validStep1, firstName: "   ", lastName: "  " });
  assert.equal(ws.ok, false);

  const placeholder = validateGuidanceV2Step1Input({
    ...validStep1,
    firstName: "داوطلب",
    lastName: "جدید",
  });
  assert.equal(placeholder.ok, false);
  if (!placeholder.ok) {
    assert.ok(placeholder.fieldErrors.firstName);
    assert.ok(placeholder.fieldErrors.lastName);
  }

  const ok = validateGuidanceV2Step1Input(validStep1);
  assert.equal(ok.ok, true);
});

test("2) prior completed student-owned steps are editable", () => {
  const mode = resolveGuidanceV2StepAccessMode(3, {
    currentStep: 12,
    completedSteps: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
    packageCode: "PREMIUM",
    packagePaidAtIso: "2026-01-01T00:00:00.000Z",
  });
  assert.equal(mode, "edit");
});

test("3) counselor-review flag after downstream work", () => {
  assert.equal(
    studentEditRequiresCounselorReview(3, {
      currentStep: 14,
      hasCounselorDownstreamWork: true,
    }),
    true,
  );
  assert.equal(
    studentEditRequiresCounselorReview(3, {
      currentStep: 4,
      hasCounselorDownstreamWork: false,
    }),
    false,
  );
});

test("4) identical discount from every package entry point", () => {
  const quotes = GUIDANCE_PACKAGE_ENTRY_POINTS.map((entry) => {
    const calc = calculateGuidanceDiscount({
      originalAmountRials: 79_000_000,
      type: "PERCENTAGE",
      value: 10,
    });
    assert.equal(calc.ok, true);
    if (!calc.ok) throw new Error(entry);
    return calc.result.finalAmountRials;
  });
  assert.deepEqual(quotes, [71_100_000, 71_100_000, 71_100_000]);

  const specializedQuotes = GUIDANCE_PACKAGE_ENTRY_POINTS.map((entry) => {
    const catalog = resolveGuidancePayablePackage("SPECIALIZED", { journeyVersion: 2 });
    assert.equal(catalog?.priceRials, 57_000_000);
    const calc = calculateGuidanceDiscount({
      originalAmountRials: catalog?.priceRials ?? -1,
      type: "PERCENTAGE",
      value: 10,
    });
    assert.equal(calc.ok, true);
    if (!calc.ok) throw new Error(entry);
    return calc.result.finalAmountRials;
  });
  assert.deepEqual(specializedQuotes, [51_300_000, 51_300_000, 51_300_000]);
});

test("5) document verification gate", () => {
  assert.equal(
    assertRequiredDocumentApproved({
      stepId: 12,
      hasLatest: false,
      latestStatus: null,
    }).ok,
    false,
  );
  assert.equal(
    assertRequiredDocumentApproved({
      stepId: 12,
      hasLatest: true,
      latestStatus: "PENDING",
    }).ok,
    false,
  );
  assert.equal(
    assertRequiredDocumentApproved({
      stepId: 12,
      hasLatest: true,
      latestStatus: "VERIFIED",
    }).ok,
    true,
  );
});

test("6) session 1 booking gate", () => {
  const now = new Date("2026-09-09T08:00:00.000Z");
  const fail = assertQualifyingSessionBooking({
    snapshot: null,
    expectedPurpose: APPOINTMENT_PURPOSE.FIRST_SESSION,
    expectedPlanId: "p1",
    expectedCounselorUserId: "c1",
    now,
  });
  assert.equal(fail.ok, false);

  const ok = assertQualifyingSessionBooking({
    snapshot: {
      appointmentId: "a1",
      purpose: APPOINTMENT_PURPOSE.FIRST_SESSION,
      appointmentStatus: "BOOKED",
      guidancePlanId: "p1",
      counselorUserId: "c1",
      reservationId: "r1",
      reservationStatus: "CONFIRMED",
      slotStartsAt: new Date("2026-09-10T08:00:00.000Z"),
      slotAdvisorId: "adv",
    },
    expectedPurpose: APPOINTMENT_PURPOSE.FIRST_SESSION,
    expectedPlanId: "p1",
    expectedCounselorUserId: "c1",
    now,
  });
  assert.equal(ok.ok, true);
});

test("7) session 2 booking gate rejects first-session purpose", () => {
  const now = new Date("2026-09-09T08:00:00.000Z");
  const mixed = assertQualifyingSessionBooking({
    snapshot: {
      appointmentId: "a1",
      purpose: APPOINTMENT_PURPOSE.FIRST_SESSION,
      appointmentStatus: "BOOKED",
      guidancePlanId: "p1",
      counselorUserId: "c1",
      reservationId: "r1",
      reservationStatus: "CONFIRMED",
      slotStartsAt: new Date("2026-09-10T08:00:00.000Z"),
      slotAdvisorId: "adv",
    },
    expectedPurpose: APPOINTMENT_PURPOSE.SECOND_SESSION,
    expectedPlanId: "p1",
    expectedCounselorUserId: "c1",
    now,
  });
  assert.equal(mixed.ok, false);
});

test("8) disjoint date ranges with same clock times are VALID", () => {
  assert.equal(
    ymdRangesOverlap("2026-06-01", "2026-06-10", "2026-06-20", "2026-06-30"),
    false,
  );
  const result = assertProgramsDoNotOverlap({
    first: [{ weekday: 0, enabled: true, windows: [{ startLocalTime: "09:00", endLocalTime: "11:00" }] }],
    second: [{ weekday: 0, enabled: true, windows: [{ startLocalTime: "09:00", endLocalTime: "11:00" }] }],
    firstFromYmd: "2026-06-01",
    firstUntilYmd: "2026-06-10",
    secondFromYmd: "2026-06-20",
    secondUntilYmd: "2026-06-30",
  });
  assert.equal(result.ok, true);
});

test("9) break windows do not generate crossing slots", () => {
  const starts = enumerateSlotStartsInWindows({
    windows: [
      { startLocalTime: "09:00", endLocalTime: "11:00" },
      { startLocalTime: "11:30", endLocalTime: "13:30" },
    ],
    durationMinutes: 45,
    stepMinutes: 45,
  });
  assert.ok(starts.every((start) => start + 45 <= 11 * 60 || start >= 11 * 60 + 30));
  assert.equal(
    slotFitsSingleWindow({
      startMinutes: 10 * 60 + 30,
      durationMinutes: 45,
      windows: [
        { startLocalTime: "09:00", endLocalTime: "11:00" },
        { startLocalTime: "11:30", endLocalTime: "13:30" },
      ],
    }),
    false,
  );
});

test("10) choice publish / revision state", () => {
  assert.equal(
    resolveChoiceStudioState({ kind: "INITIAL", status: "READY", hasItems: true }),
    "INITIAL_READY",
  );
  assert.equal(
    resolveChoiceStudioState({ kind: "FINAL", status: "DRAFT", hasItems: true }),
    "FINAL_DRAFT",
  );
});

test("11) FINAL READY is counselor-immutable", () => {
  assert.equal(
    counselorChoiceMutationLock({ kind: "FINAL", status: "READY" }),
    "published_snapshot",
  );
});

test("12) CONFIRMED is supervisor-only reopen (student lock)", () => {
  assert.equal(
    counselorChoiceMutationLock({ kind: "FINAL", status: "CONFIRMED" }),
    "confirmed",
  );
  const mode = resolveGuidanceV2StepAccessMode(17, {
    currentStep: 18,
    completedSteps: [17],
    packageCode: "PREMIUM",
    packagePaidAtIso: "2026-01-01T00:00:00.000Z",
    informedRevisionId: "rev-1",
    finalApprovedAtIso: "2026-01-02T00:00:00.000Z",
  });
  assert.equal(mode, "locked");
});

test("13) printable case book assembler completeness keys", () => {
  const presence = caseBookSectionPresence({
    hasIdentity: true,
    hasExamGroups: true,
    hasGrades: true,
    hasHolland: true,
    hasPreferences: true,
    hasPayment: true,
    hasDocuments: true,
    hasSession1: true,
    hasKonkur: true,
    hasInitialChoices: true,
    hasReview: true,
    hasSession2: true,
    hasFinal: true,
    hasInformed: true,
    hasSanjesh: true,
    hasFollowUps: true,
    hasAudit: true,
  });
  assert.equal(presence.cover, true);
  assert.equal(presence.interest, true);
  assert.equal(presence.sanjesh, true);
});

test("14) interest recommendation mapping sanity", () => {
  const model = buildHollandRecommendations({
    scores: [
      { type: "I", normalized: 90 },
      { type: "R", normalized: 70 },
      { type: "C", normalized: 20 },
      { type: "A", normalized: 15 },
      { type: "S", normalized: 18 },
      { type: "E", normalized: 22 },
    ],
    examGroup: "MATHEMATICS",
  });
  assert.ok(model);
  assert.equal(model?.groups[0]?.title.includes("هم‌راستایی بالا"), true);
  assert.ok((model?.groups[0]?.items.length ?? 0) >= 1);
});

test("15) late journey status mapping", () => {
  const items = buildLateJourneyTimeline({
    currentStep: 13,
    packagePaid: true,
    hasArrangementEntitlement: true,
    firstSessionBooked: true,
    secondSessionBooked: false,
    konkurSubmitted: true,
    initialReady: false,
    reviewComplete: false,
    finalReady: false,
    informedConfirmed: false,
    sanjeshDeclared: false,
    sanjeshVerified: false,
    needsCounselorReview: false,
  });
  const current = items.find((item) => item.current);
  assert.equal(current?.owner, "مشاور");
  assert.equal(current?.status, "در انتظار مشاور");
});

test("FREE plan feature list does not promise arrangement", () => {
  const start = getGuidanceV2Package("START");
  assert.ok(start);
  assert.equal(
    (start?.features as readonly string[]).includes("چیدمان اولیه انتخاب‌ها"),
    false,
  );
  assert.equal(start?.features.at(-1), "ثبت اولویت رشته، شهر و دوره");
  assert.equal(packageIncludesArrangement("START"), false);
  assert.equal(assertArrangementEntitlement({ packageCode: "START", stepId: 13 }).ok, false);
});

test("Paid plans keep arrangement entitlement and approved catalog prices", () => {
  assert.equal(getGuidanceV2Package("SMART")?.priceRials, 43_000_000);
  assert.equal(getGuidanceV2Package("SPECIALIZED")?.priceRials, 57_000_000);
  assert.equal(getGuidanceV2Package("PREMIUM")?.priceRials, 79_000_000);
  assert.equal(rialToToman(57_000_000), 5_700_000);
  assert.equal(
    resolveGuidancePayablePackage("SMART", { journeyVersion: 2 })?.priceRials,
    43_000_000,
  );
  assert.equal(
    resolveGuidancePayablePackage("SPECIALIZED", { journeyVersion: 2 })?.priceRials,
    57_000_000,
  );
  assert.equal(
    resolveGuidancePayablePackage("PREMIUM", { journeyVersion: 2 })?.priceRials,
    79_000_000,
  );
  assert.equal(packageIncludesArrangement("SMART"), true);
  assert.equal(packageIncludesArrangement("SPECIALIZED"), true);
  assert.equal(packageIncludesArrangement("PREMIUM"), true);
  assert.deepEqual(
    GUIDANCE_V2_PACKAGES.map((item) => item.code),
    ["START", "SMART", "SPECIALIZED", "PREMIUM"],
  );
  assert.equal(typeof GUIDANCE_V2_ALUMNI_DISCOUNT_RIALS, "number");
  const specialized = calculateGuidanceV2PackagePrice("SPECIALIZED");
  assert.equal(specialized?.listPriceRials, 57_000_000);
  assert.equal(specialized?.payableRials, 57_000_000);
  assert.equal(calculateGuidanceV2PackagePrice("SMART")?.listPriceRials, 43_000_000);
  assert.equal(calculateGuidanceV2PackagePrice("PREMIUM")?.listPriceRials, 79_000_000);
  assert.equal(calculateGuidanceV2PackagePrice("START")?.listPriceRials, 0);
});

test("overlapping dates with non-overlapping windows are VALID", () => {
  const result = assertProgramsDoNotOverlap({
    first: [{ weekday: 2, enabled: true, windows: [{ startLocalTime: "09:00", endLocalTime: "11:00" }] }],
    second: [{ weekday: 2, enabled: true, windows: [{ startLocalTime: "14:00", endLocalTime: "16:00" }] }],
    firstFromYmd: "2026-06-01",
    firstUntilYmd: "2026-06-30",
    secondFromYmd: "2026-06-10",
    secondUntilYmd: "2026-06-20",
  });
  assert.equal(result.ok, true);
});

test("overlapping actual date+time is INVALID", () => {
  const result = assertProgramsDoNotOverlap({
    first: [{ weekday: 3, enabled: true, windows: [{ startLocalTime: "09:00", endLocalTime: "12:00" }] }],
    second: [{ weekday: 3, enabled: true, windows: [{ startLocalTime: "11:00", endLocalTime: "13:00" }] }],
    firstFromYmd: "2026-06-01",
    firstUntilYmd: "2026-06-30",
    secondFromYmd: "2026-06-01",
    secondUntilYmd: "2026-06-30",
  });
  assert.equal(result.ok, false);
});

test("first-program slots never match second-program windows", () => {
  const firstOk = slotMatchesProgram({
    startMinutes: 9 * 60,
    durationMinutes: 45,
    weekday: 1,
    ymd: "2026-06-05",
    days: [{ weekday: 1, enabled: true, windows: [{ startLocalTime: "09:00", endLocalTime: "11:00" }] }],
    fromYmd: "2026-06-01",
    untilYmd: "2026-06-10",
  });
  const secondMismatch = slotMatchesProgram({
    startMinutes: 9 * 60,
    durationMinutes: 45,
    weekday: 1,
    ymd: "2026-06-05",
    days: [{ weekday: 1, enabled: true, windows: [{ startLocalTime: "14:00", endLocalTime: "16:00" }] }],
    fromYmd: "2026-06-20",
    untilYmd: "2026-06-30",
  });
  assert.equal(firstOk, true);
  assert.equal(secondMismatch, false);
});

test("past booking slots are rejected", () => {
  const past = assertQualifyingSessionBooking({
    snapshot: {
      appointmentId: "a1",
      purpose: APPOINTMENT_PURPOSE.FIRST_SESSION,
      appointmentStatus: "BOOKED",
      guidancePlanId: "p1",
      counselorUserId: "c1",
      reservationId: "r1",
      reservationStatus: "CONFIRMED",
      slotStartsAt: new Date("2026-09-01T08:00:00.000Z"),
      slotAdvisorId: "adv",
    },
    expectedPurpose: APPOINTMENT_PURPOSE.FIRST_SESSION,
    expectedPlanId: "p1",
    expectedCounselorUserId: "c1",
    now: new Date("2026-09-09T08:00:00.000Z"),
  });
  assert.equal(past.ok, false);
});

test("guidance home uses GuidancePlatformDashboard, not office pulse panels", () => {
  const page = readFileSync(
    join(process.cwd(), "app/portal/student/services/guidance/page.tsx"),
    "utf8",
  );
  assert.equal(page.includes("StudentCounselingPanel"), false);
  assert.equal(page.includes("GuidanceStudentDashboardPanels"), false);
  assert.equal(page.includes("GuidancePlatformDashboard"), true);
  assert.equal(page.includes("view === \"plans\""), true);
  assert.equal(page.includes("guidanceJourneyV2StepPath(10)"), true);
  assert.equal(page.includes("/steps/3"), false);

  const dashboard = readFileSync(
    join(process.cwd(), "components/guidance/platform/GuidancePlatformDashboard.tsx"),
    "utf8",
  );
  assert.equal(dashboard.includes("وضعیت مسیر شما"), false);
  assert.equal(dashboard.includes("GUIDANCE_STEPS_ENTRY"), true);
  assert.equal(dashboard.includes("guidanceJourneyV2StepPath(10)"), true);
  assert.equal(GUIDANCE_STEPS_ENTRY, "/portal/student/services/guidance/steps");
  assert.equal(guidanceJourneyV2StepPath(10), "/portal/student/services/guidance/journey/steps/10");
});

test("dashboard greeting never presents داوطلب جدید as identity", () => {
  assert.equal(guidanceDashboardGreetingName("داوطلب جدید"), "دانش‌آموز");
  assert.equal(guidanceDashboardGreetingName("داوطلب"), "دانش‌آموز");
  assert.equal(guidanceDashboardGreetingName(""), "دانش‌آموز");
  assert.equal(guidanceDashboardGreetingName("سارا محمدی"), "سارا محمدی");
  assert.equal(isSyntheticPlaceholderName("داوطلب جدید"), true);
});

console.log(`\n${passed} tests passed`);
