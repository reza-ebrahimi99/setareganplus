/**
 * Pure SXP Phase S1 tests. No database connection.
 */

import assert from "node:assert/strict";
import { DomainEventType } from "../generated/prisma/enums";
import {
  catalogSkipReason,
  feedRankFor,
  isFeedEligibleEventType,
  timelineSummaryFor,
  timelineTitleFor,
} from "../lib/sxp/engine/catalog";
import { buildWidgetSnapshots } from "../lib/sxp/engine/widgets";
import { timelineViewerFilter } from "../lib/sxp/engine/visibility";
import { ExperienceTimelineVisibility } from "../generated/prisma/enums";
import { resolveSxpFlag } from "../lib/sxp/flags";
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

console.log(`\n${passed} tests passed`);
