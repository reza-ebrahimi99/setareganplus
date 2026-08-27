/**
 * Pure SXP Phase S1 + additive S2 tests. No database connection.
 */

import assert from "node:assert/strict";
import {
  DomainEventType,
  ExperienceFileKind,
  ExperienceTimelineVisibility,
  PortalAccountType,
} from "../generated/prisma/enums";
import {
  catalogSkipReason,
  feedRankFor,
  isFeedEligibleEventType,
  timelineSummaryFor,
  timelineTitleFor,
} from "../lib/sxp/engine/catalog";
import { buildWidgetSnapshots } from "../lib/sxp/engine/widgets";
import { timelineViewerFilter } from "../lib/sxp/engine/visibility";
import { resolveSxpFlag, resolveSxpFilesFlag } from "../lib/sxp/flags";
import {
  buildCardSnapshot,
  computeProfileCompletion,
} from "../lib/sxp/engine/card";
import { groupTimelineByTehranDay, relativeTimeFa } from "../lib/sxp/engine/timeline-group";
import {
  decodeTimelineCursor,
  encodeTimelineCursor,
  matchesTimelineSearch,
  parseTimelineTypeFilter,
  timelineTypeFilterToPrefix,
} from "../lib/sxp/engine/timeline-query";
import { canViewerAccessExperienceFile } from "../lib/sxp/engine/file-visibility";
import { smsInboxEventId } from "../lib/sxp/constants";

let passed = 0;

function test(name: string, fn: () => void) {
  fn();
  passed += 1;
  console.log(`✓ ${name}`);
}

test("sxp flag defaults off when no org row exists", () => {
  assert.equal(
    resolveSxpFlag({ hardOff: false, orgFlagEnabled: null }),
    false,
  );
});

test("sxp flag stays off when org row is disabled", () => {
  assert.equal(
    resolveSxpFlag({ hardOff: false, orgFlagEnabled: false }),
    false,
  );
});

test("sxp flag is on only when org row is enabled", () => {
  assert.equal(
    resolveSxpFlag({ hardOff: false, orgFlagEnabled: true }),
    true,
  );
});

test("STAROS_SXP_HARD_OFF wins over an enabled org flag", () => {
  assert.equal(
    resolveSxpFlag({ hardOff: true, orgFlagEnabled: true }),
    false,
  );
});

test("booking confirmation is timeline + feed eligible", () => {
  assert.equal(catalogSkipReason({ eventType: DomainEventType.BOOKING_CONFIRMED }), null);
  assert.equal(isFeedEligibleEventType(DomainEventType.BOOKING_CONFIRMED), true);
  assert.equal(timelineTitleFor(DomainEventType.BOOKING_CONFIRMED), "رزرو تأیید شد");
  assert.ok(feedRankFor(DomainEventType.BOOKING_CONFIRMED) > 0);
});

test("form lead created is not a personal hub event", () => {
  assert.equal(
    catalogSkipReason({ eventType: DomainEventType.FORM_LEAD_CREATED }),
    "not_personal",
  );
  assert.equal(isFeedEligibleEventType(DomainEventType.FORM_LEAD_CREATED), false);
});

test("OTP SMS is skipped and never feed eligible", () => {
  assert.equal(
    catalogSkipReason({ eventType: "SMS_SENT", smsPurpose: "otp" }),
    "otp_skipped",
  );
  assert.equal(isFeedEligibleEventType("SMS_SENT"), false);
});

test("SMS timeline summary never includes a body", () => {
  const summary = timelineSummaryFor({
    eventType: "SMS_SENT",
    smsPurpose: "booking_confirmation",
  });
  assert.equal(summary, "پیامک اطلاع‌رسانی");
  assert.equal(summary?.includes("کد"), false);
});

test("synthetic SMS inbox keys are stable", () => {
  assert.equal(smsInboxEventId("abc"), "sms-message:abc");
});

test("timeline viewer cannot see another user's events", () => {
  assert.equal(
    timelineViewerFilter({
      viewerUserId: "user-a",
      rowUserId: "user-b",
      visibility: ExperienceTimelineVisibility.SELF,
    }),
    false,
  );
  assert.equal(
    timelineViewerFilter({
      viewerUserId: "user-a",
      rowUserId: "user-a",
      visibility: ExperienceTimelineVisibility.SELF,
    }),
    true,
  );
  assert.equal(
    timelineViewerFilter({
      viewerUserId: "user-a",
      rowUserId: "user-a",
      visibility: ExperienceTimelineVisibility.STAFF,
    }),
    false,
  );
});

test("widget snapshotter uses projected events, not live booking tables", () => {
  const snapshots = buildWidgetSnapshots([
    {
      eventType: DomainEventType.BOOKING_CONFIRMED,
      aggregateId: "res-1",
      occurredAt: new Date("2026-08-01T10:00:00.000Z"),
      title: "رزرو تأیید شد",
      trackingCode: "ABC123",
      status: "CONFIRMED",
    },
    {
      eventType: DomainEventType.FORM_SUBMISSION_RECEIVED,
      aggregateId: "sub-1",
      occurredAt: new Date("2026-08-02T10:00:00.000Z"),
      title: "فرم ارسال شد",
      trackingCode: null,
      status: null,
    },
  ]);

  assert.equal(snapshots.OPEN_BALANCE.empty, true);
  if (snapshots.OPEN_BALANCE.empty) {
    assert.equal(snapshots.OPEN_BALANCE.reason, "phase_s1_unavailable");
  }
  assert.equal(snapshots.LOYALTY_CHIP.empty, true);
  assert.equal(snapshots.READY_PICKUP.empty, true);
  assert.equal(snapshots.UPCOMING_RESERVATION.empty, false);
  if (!snapshots.UPCOMING_RESERVATION.empty && "trackingCode" in snapshots.UPCOMING_RESERVATION) {
    assert.equal(snapshots.UPCOMING_RESERVATION.trackingCode, "ABC123");
  }
  assert.equal(snapshots.NEXT_ACTION.empty, false);
  if (!snapshots.NEXT_ACTION.empty && "code" in snapshots.NEXT_ACTION) {
    assert.equal(snapshots.NEXT_ACTION.code, "OPEN_RESERVATION");
  }
  assert.equal(snapshots.RECENT_FEED.empty, false);
});

test("cancelled booking is not an upcoming reservation", () => {
  const snapshots = buildWidgetSnapshots([
    {
      eventType: DomainEventType.BOOKING_CONFIRMED,
      aggregateId: "res-1",
      occurredAt: new Date("2026-08-01T10:00:00.000Z"),
      title: "رزرو تأیید شد",
      trackingCode: "ABC123",
      status: "CONFIRMED",
    },
    {
      eventType: DomainEventType.BOOKING_CANCELLED,
      aggregateId: "res-1",
      occurredAt: new Date("2026-08-02T10:00:00.000Z"),
      title: "رزرو لغو شد",
      trackingCode: "ABC123",
      status: "CANCELLED",
    },
  ]);
  assert.equal(snapshots.UPCOMING_RESERVATION.empty, true);
});

test("repeating the same projected events stays idempotent for widgets", () => {
  const events = [
    {
      eventType: DomainEventType.BOOKING_CREATED,
      aggregateId: "res-9",
      occurredAt: new Date("2026-08-03T08:00:00.000Z"),
      title: "رزرو ثبت شد",
      trackingCode: "Z1",
      status: "PENDING",
    },
  ];
  assert.deepEqual(buildWidgetSnapshots(events), buildWidgetSnapshots(events));
});

test("FILES_READY stays empty without a file projection count", () => {
  const snapshots = buildWidgetSnapshots([]);
  assert.equal(snapshots.FILES_READY.empty, true);
});

test("FILES_READY uses the engine file count extra, not ERP", () => {
  const snapshots = buildWidgetSnapshots([], { filesCount: 4 });
  assert.equal(snapshots.FILES_READY.empty, false);
  if (!snapshots.FILES_READY.empty && "count" in snapshots.FILES_READY) {
    assert.equal(snapshots.FILES_READY.count, 4);
  }
});

test("sxp.files stays off unless sxp is on and the files row is enabled", () => {
  assert.equal(
    resolveSxpFilesFlag({ sxpEnabled: false, filesRowEnabled: true }),
    false,
  );
  assert.equal(
    resolveSxpFilesFlag({ sxpEnabled: true, filesRowEnabled: null }),
    false,
  );
  assert.equal(
    resolveSxpFilesFlag({ sxpEnabled: true, filesRowEnabled: true }),
    true,
  );
});

test("national code is masked and never placed in the QR payload", () => {
  const snapshot = buildCardSnapshot({
    organizationId: "org-1",
    organizationName: "مدرسه",
    userId: "user-1",
    studentId: "stu-1",
    displayName: "علی",
    studentCode: "std-ali",
    nationalCode: "0012345678",
    gradeName: "هفتم",
    schoolYear: "1404-1405",
    portraitUrl: null,
    branchName: null,
    membershipLabel: "دانش‌آموز",
    interests: "ریاضی",
  });
  assert.equal(snapshot.maskedNationalCode, "********5678");
  assert.equal(snapshot.qrPayload.startsWith("sxp-card:"), true);
  assert.equal(snapshot.qrPayload.includes("0012345678"), false);
  assert.equal(snapshot.qrPayload.includes("12345678"), false);
  assert.equal(snapshot.studentCode, "std-ali");
});

test("profile completion is a 0-1 ratio of filled identity fields", () => {
  assert.equal(
    computeProfileCompletion({
      displayName: "علی",
      portraitUrl: null,
      gradeName: null,
      schoolYear: null,
      interests: null,
    }),
    0.2,
  );
  assert.equal(
    computeProfileCompletion({
      displayName: "علی",
      portraitUrl: "/p.jpg",
      gradeName: "هفتم",
      schoolYear: "1404-1405",
      interests: "ریاضی",
    }),
    1,
  );
});

test("timeline search matches title and summary", () => {
  assert.equal(
    matchesTimelineSearch({ title: "رزرو تأیید شد", summary: "کد پیگیری ABC" }, "abc"),
    true,
  );
  assert.equal(
    matchesTimelineSearch({ title: "فرم ارسال شد", summary: null }, "رزرو"),
    false,
  );
});

test("timeline type filter maps to event prefixes", () => {
  assert.equal(parseTimelineTypeFilter("booking"), "booking");
  assert.equal(parseTimelineTypeFilter("nope"), "all");
  assert.equal(timelineTypeFilterToPrefix("sms"), "SMS_");
  assert.equal(timelineTypeFilterToPrefix("all"), null);
});

test("timeline cursor round-trips occurredAt and id", () => {
  const occurredAt = new Date("2026-08-18T10:00:00.000Z");
  const encoded = encodeTimelineCursor({ occurredAt, id: "evt-1" });
  const decoded = decodeTimelineCursor(encoded);
  assert.equal(decoded?.id, "evt-1");
  assert.equal(decoded?.occurredAt.toISOString(), occurredAt.toISOString());
  assert.equal(decodeTimelineCursor("bad"), null);
});

test("timeline groups by Tehran jalali day", () => {
  const groups = groupTimelineByTehranDay([
    { id: "a", occurredAt: new Date("2026-08-18T12:00:00.000Z") },
    { id: "b", occurredAt: new Date("2026-08-18T15:00:00.000Z") },
    { id: "c", occurredAt: new Date("2026-08-19T12:00:00.000Z") },
  ]);
  assert.equal(groups.length, 2);
  assert.equal(groups[0]?.items.length, 2);
  assert.equal(groups[1]?.items.length, 1);
});

test("relative time uses Persian digits", () => {
  const now = new Date("2026-08-18T12:10:00.000Z");
  const then = new Date("2026-08-18T12:05:00.000Z");
  assert.equal(relativeTimeFa(then, now), "۵ دقیقه پیش");
});

test("guardian cannot see certificate files without canViewCertificates", () => {
  assert.equal(
    canViewerAccessExperienceFile({
      ownerUserId: "user-1",
      viewerUserId: "user-1",
      visibility: ExperienceTimelineVisibility.SELF,
      kind: ExperienceFileKind.CERTIFICATE,
      accountType: PortalAccountType.GUARDIAN,
      canViewCertificates: false,
      canViewAcademicData: true,
    }),
    false,
  );
  assert.equal(
    canViewerAccessExperienceFile({
      ownerUserId: "user-1",
      viewerUserId: "user-1",
      visibility: ExperienceTimelineVisibility.SELF,
      kind: ExperienceFileKind.CERTIFICATE,
      accountType: PortalAccountType.GUARDIAN,
      canViewCertificates: true,
      canViewAcademicData: true,
    }),
    true,
  );
});

test("academic booklet files follow canViewAcademicData for guardians", () => {
  assert.equal(
    canViewerAccessExperienceFile({
      ownerUserId: "user-1",
      viewerUserId: "user-1",
      visibility: ExperienceTimelineVisibility.SELF,
      kind: ExperienceFileKind.BOOKLET,
      accountType: PortalAccountType.GUARDIAN,
      canViewCertificates: true,
      canViewAcademicData: false,
    }),
    false,
  );
});

console.log(`\n${passed} tests passed`);
