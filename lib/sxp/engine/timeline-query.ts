export const FILE_READY_EVENT_TYPE = "FILE_READY";

export type TimelineTypeFilter = "all" | "booking" | "form" | "sms" | "file";

export function timelineTypeFilterToPrefix(
  filter: TimelineTypeFilter,
): string | null {
  switch (filter) {
    case "booking":
      return "BOOKING_";
    case "form":
      return "FORM_";
    case "sms":
      return "SMS_";
    case "file":
      return "FILE_";
    default:
      return null;
  }
}

export function parseTimelineTypeFilter(raw: string | null | undefined): TimelineTypeFilter {
  const value = (raw ?? "all").trim().toLowerCase();
  if (
    value === "booking" ||
    value === "form" ||
    value === "sms" ||
    value === "file"
  ) {
    return value;
  }
  return "all";
}

export function matchesTimelineSearch(
  item: { title: string; summary: string | null },
  query: string,
): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  const hay = `${item.title} ${item.summary ?? ""}`.toLowerCase();
  return hay.includes(needle);
}

export type TimelineDayGroup<T> = {
  dayKey: string;
  label: string;
  items: T[];
};

export function encodeTimelineCursor(item: { occurredAt: Date; id: string }): string {
  return Buffer.from(`${item.occurredAt.toISOString()}|${item.id}`, "utf8").toString(
    "base64url",
  );
}

export function decodeTimelineCursor(
  raw: string | null | undefined,
): { occurredAt: Date; id: string } | null {
  if (!raw) return null;
  try {
    const text = Buffer.from(raw, "base64url").toString("utf8");
    const sep = text.indexOf("|");
    if (sep <= 0) return null;
    const occurredAt = new Date(text.slice(0, sep));
    const id = text.slice(sep + 1);
    if (!id || Number.isNaN(occurredAt.getTime())) return null;
    return { occurredAt, id };
  } catch {
    return null;
  }
}
