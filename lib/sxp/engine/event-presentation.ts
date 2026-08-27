export type TimelineEventTone = "booking" | "form" | "sms" | "file" | "other";

export function timelineEventTone(eventType: string): TimelineEventTone {
  if (eventType.startsWith("BOOKING_")) return "booking";
  if (eventType.startsWith("FORM_")) return "form";
  if (eventType.startsWith("SMS_")) return "sms";
  if (eventType.startsWith("FILE_")) return "file";
  return "other";
}

export function timelineEventToneLabel(tone: TimelineEventTone): string {
  switch (tone) {
    case "booking":
      return "رزرو";
    case "form":
      return "فرم";
    case "sms":
      return "پیامک";
    case "file":
      return "فایل";
    default:
      return "رویداد";
  }
}
