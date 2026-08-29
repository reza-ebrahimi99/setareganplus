import { PortalWidget } from "@/components/portal/PortalWidget";

/** Notification center summary — architecture + empty state only. */
export function PortalNotificationsWidget() {
  return (
    <PortalWidget
      id="notifications"
      module="notifications"
      title="اعلان‌ها"
      icon="bell"
      description="مرکز پیام‌های مسیر تحصیلی — فعلاً آماده دریافت."
      empty
      emptyTitle="همه‌چیز آرام است"
      emptyDescription="وقتی پیام مشاور، یادآوری جلسه یا وضعیت کارنامه برسد، اینجا می‌آید."
      className="portal-bento__notifications"
    />
  );
}
