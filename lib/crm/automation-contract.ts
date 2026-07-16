/**
 * Safe AutomationRule JSON contract (StarOS v0.7).
 * No arbitrary code, SQL, URLs, or server commands — allowlisted actions only.
 */

import { DomainEventType } from "@/generated/prisma/enums";

export const AUTOMATION_ACTION_TYPES = [
  "CREATE_LEAD",
  "UPDATE_STAGE",
  "ASSIGN_OWNER",
  "CREATE_TASK",
  "SET_NEXT_FOLLOW_UP",
  "ADD_ACTIVITY",
  "ENQUEUE_SMS",
  "UPDATE_SCORE",
  "MARK_WON",
  "MARK_LOST",
] as const;

export type AutomationActionType = (typeof AUTOMATION_ACTION_TYPES)[number];

export type AutomationConditions = {
  stageIds?: string[];
  stageTypes?: string[];
  scoreMin?: number;
  scoreMax?: number;
  sourceTypes?: string[];
  hasBooking?: boolean;
  hasCompletedTask?: boolean;
  hoursSinceEventMin?: number;
  hoursSinceEventMax?: number;
  branchId?: string;
  /** Semantic field answer equals (fieldKey → value). Safe string compare only. */
  answerEquals?: Record<string, string>;
};

export type AutomationAction =
  | { type: "CREATE_LEAD"; pipelineId?: string; stageId?: string; assignToUserId?: string }
  | { type: "UPDATE_STAGE"; stageId: string }
  | { type: "ASSIGN_OWNER"; userId: string }
  | {
      type: "CREATE_TASK";
      title: string;
      taskType?: string;
      priority?: string;
      dueMinutes?: number;
      assignToUserId?: string;
    }
  | { type: "SET_NEXT_FOLLOW_UP"; dueMinutes: number }
  | { type: "ADD_ACTIVITY"; title: string; summary?: string; activityType?: string }
  | { type: "ENQUEUE_SMS"; templateCode: string; purpose?: string }
  | { type: "UPDATE_SCORE"; delta?: number; recalculate?: boolean }
  | { type: "MARK_WON" }
  | { type: "MARK_LOST"; reason?: string };

export type AutomationActionConfig = {
  actions: AutomationAction[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseAutomationConditions(raw: unknown): AutomationConditions {
  if (!isRecord(raw)) return {};
  const out: AutomationConditions = {};
  if (Array.isArray(raw.stageIds)) {
    out.stageIds = raw.stageIds.filter((v): v is string => typeof v === "string");
  }
  if (Array.isArray(raw.stageTypes)) {
    out.stageTypes = raw.stageTypes.filter((v): v is string => typeof v === "string");
  }
  if (typeof raw.scoreMin === "number") out.scoreMin = raw.scoreMin;
  if (typeof raw.scoreMax === "number") out.scoreMax = raw.scoreMax;
  if (Array.isArray(raw.sourceTypes)) {
    out.sourceTypes = raw.sourceTypes.filter((v): v is string => typeof v === "string");
  }
  if (typeof raw.hasBooking === "boolean") out.hasBooking = raw.hasBooking;
  if (typeof raw.hasCompletedTask === "boolean") {
    out.hasCompletedTask = raw.hasCompletedTask;
  }
  if (typeof raw.hoursSinceEventMin === "number") {
    out.hoursSinceEventMin = raw.hoursSinceEventMin;
  }
  if (typeof raw.hoursSinceEventMax === "number") {
    out.hoursSinceEventMax = raw.hoursSinceEventMax;
  }
  if (typeof raw.branchId === "string" && raw.branchId.trim()) {
    out.branchId = raw.branchId.trim();
  }
  if (isRecord(raw.answerEquals)) {
    const entries: Record<string, string> = {};
    for (const [k, v] of Object.entries(raw.answerEquals)) {
      if (typeof v === "string") entries[k] = v;
    }
    out.answerEquals = entries;
  }
  return out;
}

export function parseAutomationActionConfig(raw: unknown): AutomationActionConfig {
  if (!isRecord(raw)) return { actions: [] };
  const list = Array.isArray(raw.actions) ? raw.actions : [];
  const actions: AutomationAction[] = [];
  for (const item of list) {
    if (!isRecord(item) || typeof item.type !== "string") continue;
    if (!(AUTOMATION_ACTION_TYPES as readonly string[]).includes(item.type)) continue;
    const type = item.type as AutomationActionType;
    switch (type) {
      case "CREATE_LEAD":
        actions.push({
          type,
          pipelineId: typeof item.pipelineId === "string" ? item.pipelineId : undefined,
          stageId: typeof item.stageId === "string" ? item.stageId : undefined,
          assignToUserId:
            typeof item.assignToUserId === "string" ? item.assignToUserId : undefined,
        });
        break;
      case "UPDATE_STAGE":
        if (typeof item.stageId === "string" && item.stageId.trim()) {
          actions.push({ type, stageId: item.stageId.trim() });
        }
        break;
      case "ASSIGN_OWNER":
        if (typeof item.userId === "string" && item.userId.trim()) {
          actions.push({ type, userId: item.userId.trim() });
        }
        break;
      case "CREATE_TASK":
        if (typeof item.title === "string" && item.title.trim()) {
          actions.push({
            type,
            title: item.title.trim(),
            taskType: typeof item.taskType === "string" ? item.taskType : undefined,
            priority: typeof item.priority === "string" ? item.priority : undefined,
            dueMinutes: typeof item.dueMinutes === "number" ? item.dueMinutes : undefined,
            assignToUserId:
              typeof item.assignToUserId === "string" ? item.assignToUserId : undefined,
          });
        }
        break;
      case "SET_NEXT_FOLLOW_UP":
        if (typeof item.dueMinutes === "number" && item.dueMinutes > 0) {
          actions.push({ type, dueMinutes: item.dueMinutes });
        }
        break;
      case "ADD_ACTIVITY":
        if (typeof item.title === "string" && item.title.trim()) {
          actions.push({
            type,
            title: item.title.trim(),
            summary: typeof item.summary === "string" ? item.summary : undefined,
            activityType:
              typeof item.activityType === "string" ? item.activityType : undefined,
          });
        }
        break;
      case "ENQUEUE_SMS":
        if (typeof item.templateCode === "string" && item.templateCode.trim()) {
          actions.push({
            type,
            templateCode: item.templateCode.trim(),
            purpose: typeof item.purpose === "string" ? item.purpose : undefined,
          });
        }
        break;
      case "UPDATE_SCORE":
        actions.push({
          type,
          delta: typeof item.delta === "number" ? item.delta : undefined,
          recalculate: item.recalculate === true,
        });
        break;
      case "MARK_WON":
        actions.push({ type });
        break;
      case "MARK_LOST":
        actions.push({
          type,
          reason: typeof item.reason === "string" ? item.reason : undefined,
        });
        break;
    }
  }
  return { actions };
}

export function validateAutomationActionConfig(raw: unknown): string | null {
  if (!isRecord(raw)) return "پیکربندی اکشن‌ها معتبر نیست.";
  if (!Array.isArray(raw.actions)) return "فهرست اکشن‌ها الزامی است.";
  for (const item of raw.actions) {
    if (!isRecord(item) || typeof item.type !== "string") {
      return "هر اکشن باید نوع مجاز داشته باشد.";
    }
    if (!(AUTOMATION_ACTION_TYPES as readonly string[]).includes(item.type)) {
      return `اکشن غیرمجاز: ${item.type}`;
    }
  }
  return null;
}

export function isKnownDomainEventType(value: string): value is DomainEventType {
  return (Object.values(DomainEventType) as string[]).includes(value);
}

/** Starter presets — templates only; admin must explicitly create/enable. */
export const AUTOMATION_PRESETS: ReadonlyArray<{
  code: string;
  name: string;
  description: string;
  trigger: DomainEventType;
  conditions: AutomationConditions;
  actionConfig: AutomationActionConfig;
}> = [
  {
    code: "form_prereg_lead_call",
    name: "فرم پیش‌ثبت‌نام → ساخت لید + وظیفه تماس",
    description: "پس از دریافت پاسخ فرم، لید بسازید و وظیفه تماس ایجاد کنید.",
    trigger: DomainEventType.FORM_SUBMISSION_RECEIVED,
    conditions: {},
    actionConfig: {
      actions: [
        { type: "CREATE_LEAD" },
        {
          type: "CREATE_TASK",
          title: "تماس اولیه با متقاضی",
          taskType: "CALL",
          dueMinutes: 60,
        },
      ],
    },
  },
  {
    code: "booking_to_consultation",
    name: "رزرو مشاوره → انتقال به مرحله مشاوره",
    description: "پس از تأیید رزرو، لید را به مرحله مشاوره منتقل کنید.",
    trigger: DomainEventType.BOOKING_CONFIRMED,
    conditions: {},
    actionConfig: {
      actions: [
        { type: "CREATE_LEAD" },
        {
          type: "CREATE_TASK",
          title: "آماده‌سازی جلسه مشاوره",
          taskType: "CONSULTATION",
          dueMinutes: 120,
        },
      ],
    },
  },
  {
    code: "booking_cancel_followup",
    name: "لغو رزرو → ساخت وظیفه پیگیری",
    description: "پس از لغو رزرو، وظیفه پیگیری ایجاد کنید.",
    trigger: DomainEventType.BOOKING_CANCELLED,
    conditions: {},
    actionConfig: {
      actions: [
        {
          type: "CREATE_TASK",
          title: "پیگیری پس از لغو رزرو",
          taskType: "FOLLOW_UP",
          dueMinutes: 180,
        },
      ],
    },
  },
  {
    code: "no_followup_24h",
    name: "عدم پیگیری ۲۴ ساعته → یادآوری",
    description: "یادآوری زمان‌بندی‌شده برای لیدهای بدون تماس (از طریق worker زمان‌بندی).",
    trigger: DomainEventType.FORM_LEAD_CREATED,
    conditions: { hoursSinceEventMin: 24 },
    actionConfig: {
      actions: [
        {
          type: "CREATE_TASK",
          title: "یادآوری: تماس پس از ۲۴ ساعت",
          taskType: "FOLLOW_UP",
          dueMinutes: 30,
        },
      ],
    },
  },
];
