import { ExperienceWidgetKey } from "@/generated/prisma/enums";
import {
  feedRankFor,
  isActiveBookingEventType,
  isBookingEventType,
  isFeedEligibleEventType,
} from "@/lib/sxp/engine/catalog";

export type WidgetEmptyReason = "no_events" | "phase_s1_unavailable";

export type EmptyWidgetPayload = {
  empty: true;
  reason: WidgetEmptyReason;
};

export type NextActionWidgetPayload = {
  empty: false;
  code: "OPEN_RESERVATION" | "VIEW_TIMELINE";
  label: string;
  eventType: string;
};

export type UpcomingReservationWidgetPayload = {
  empty: false;
  trackingCode: string | null;
  status: string | null;
  eventType: string;
  title: string;
};

export type RecentFeedWidgetPayload = {
  empty: false;
  items: Array<{
    title: string;
    occurredAt: string;
    eventType: string;
  }>;
};

export type WidgetPayload =
  | EmptyWidgetPayload
  | NextActionWidgetPayload
  | UpcomingReservationWidgetPayload
  | RecentFeedWidgetPayload;

export type TimelineSlice = {
  eventType: string;
  aggregateId: string;
  occurredAt: Date;
  title: string;
  trackingCode: string | null;
  status: string | null;
};

export type WidgetSnapshotMap = Record<ExperienceWidgetKey, WidgetPayload>;

function empty(reason: WidgetEmptyReason): EmptyWidgetPayload {
  return { empty: true, reason };
}

function latestActiveBooking(events: TimelineSlice[]): TimelineSlice | null {
  const latestByAggregate = new Map<string, TimelineSlice>();
  for (const event of events) {
    if (!isBookingEventType(event.eventType)) continue;
    const current = latestByAggregate.get(event.aggregateId);
    if (!current || event.occurredAt.getTime() >= current.occurredAt.getTime()) {
      latestByAggregate.set(event.aggregateId, event);
    }
  }

  let best: TimelineSlice | null = null;
  for (const event of latestByAggregate.values()) {
    if (!isActiveBookingEventType(event.eventType)) continue;
    if (!best || event.occurredAt.getTime() > best.occurredAt.getTime()) {
      best = event;
    }
  }
  return best;
}

function topFeedEvent(events: TimelineSlice[]): TimelineSlice | null {
  const eligible = events.filter((event) => isFeedEligibleEventType(event.eventType));
  eligible.sort((a, b) => {
    const rankDelta = feedRankFor(b.eventType) - feedRankFor(a.eventType);
    if (rankDelta !== 0) return rankDelta;
    return b.occurredAt.getTime() - a.occurredAt.getTime();
  });
  return eligible[0] ?? null;
}

/**
 * Pure snapshot builder. Hub HTTP must persist/read these blobs, not live ERP tables.
 */
export function buildWidgetSnapshots(events: TimelineSlice[]): WidgetSnapshotMap {
  const upcoming = latestActiveBooking(events);
  const topFeed = topFeedEvent(events);
  const feedItems = events
    .filter((event) => isFeedEligibleEventType(event.eventType))
    .sort((a, b) => {
      const rankDelta = feedRankFor(b.eventType) - feedRankFor(a.eventType);
      if (rankDelta !== 0) return rankDelta;
      return b.occurredAt.getTime() - a.occurredAt.getTime();
    })
    .slice(0, 5)
    .map((event) => ({
      title: event.title,
      occurredAt: event.occurredAt.toISOString(),
      eventType: event.eventType,
    }));

  const nextAction: WidgetPayload = upcoming
    ? {
        empty: false,
        code: "OPEN_RESERVATION",
        label: "پیگیری رزرو",
        eventType: upcoming.eventType,
      }
    : topFeed
      ? {
          empty: false,
          code: "VIEW_TIMELINE",
          label: "مشاهده روند",
          eventType: topFeed.eventType,
        }
      : empty("no_events");

  return {
    NEXT_ACTION: nextAction,
    UPCOMING_RESERVATION: upcoming
      ? {
          empty: false,
          trackingCode: upcoming.trackingCode,
          status: upcoming.status,
          eventType: upcoming.eventType,
          title: upcoming.title,
        }
      : empty("no_events"),
    OPEN_BALANCE: empty("phase_s1_unavailable"),
    LOYALTY_CHIP: empty("phase_s1_unavailable"),
    READY_PICKUP: empty("phase_s1_unavailable"),
    RECENT_FEED:
      feedItems.length > 0
        ? { empty: false, items: feedItems }
        : empty("no_events"),
  };
}

export const DEFAULT_WIDGET_KEYS: ExperienceWidgetKey[] = [
  ExperienceWidgetKey.NEXT_ACTION,
  ExperienceWidgetKey.UPCOMING_RESERVATION,
  ExperienceWidgetKey.OPEN_BALANCE,
  ExperienceWidgetKey.LOYALTY_CHIP,
  ExperienceWidgetKey.READY_PICKUP,
  ExperienceWidgetKey.RECENT_FEED,
];
