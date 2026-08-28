import type { OpsQueueId } from "@/lib/ops/types";

export type OpsQueueCatalogEntry = {
  queueId: OpsQueueId;
  titleFa: string;
  descriptionFa: string;
};

export const OPS_QUEUE_CATALOG: readonly OpsQueueCatalogEntry[] = [
  {
    queueId: "ASSIGNMENT",
    titleFa: "صف تخصیص",
    descriptionFa: "لیدهای بدون مالک برای تخصیص از طریق Truth Spine.",
  },
  {
    queueId: "FOLLOW_UP",
    titleFa: "صف پیگیری",
    descriptionFa: "لیدهایی با nextFollowUpAt سررسیدشده (ساعت اصلی).",
  },
  {
    queueId: "CALL",
    titleFa: "صف تماس",
    descriptionFa: "وظایف CALL باز، ثبت‌نام NEEDS_CALL، و لیدهای بدون تماس.",
  },
  {
    queueId: "SLA",
    titleFa: "صف SLA",
    descriptionFa: "موارد نقض یا نزدیک به نقض سیاست SLA سازمان.",
  },
  {
    queueId: "ESCALATION",
    titleFa: "صف ارجاع",
    descriptionFa: "ارجاع‌های باز برای اقدام مدیر.",
  },
] as const;

export function listOpsQueueCatalog(): readonly OpsQueueCatalogEntry[] {
  return OPS_QUEUE_CATALOG;
}
