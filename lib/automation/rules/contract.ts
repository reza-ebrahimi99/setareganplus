/**
 * Safe AutomationRule JSON contract (Sprint 5).
 * No arbitrary code, SQL, URLs, or server commands — allowlisted actions only.
 */

import { DomainEventType } from "@/generated/prisma/enums";

export const AUTOMATION_ACTION_TYPES = [
  "CREATE_LEAD",
  "UPDATE_STAGE",
  "ASSIGN_OWNER",
  "DISPATCH_OWNER",
  "CREATE_TASK",
  "SET_NEXT_FOLLOW_UP",
  "ADD_ACTIVITY",
  "ENQUEUE_SMS",
  "UPDATE_SCORE",
  "MARK_WON",
  "MARK_LOST",
  "NOTIFY_USER",
  "OPEN_ESCALATION",
  "ESCALATE_REASSIGN",
  "ENQUEUE_DELAYED_EVENT",
] as const;

export type AutomationActionType = (typeof AUTOMATION_ACTION_TYPES)[number];

export type AutomationConditions = {
  stageIds?: string[];
  stageTypes?: string[];
  scoreMin?: number;
  scoreMax?: number;
  sourceTypes?: string[];
  /** Free-text Lead.source match (case-sensitive). */
  sources?: string[];
  hasBooking?: boolean;
  hasCompletedTask?: boolean;
  hoursSinceEventMin?: number;
  hoursSinceEventMax?: number;
  branchId?: string;
  answerEquals?: Record<string, string>;
  ownerIsNull?: boolean;
  ownershipSourceIn?: string[];
  leadStatusIn?: string[];
  registrationStatusIn?: string[];
  paymentStatusIn?: string[];
  slaStateIn?: string[];
  queueIdIn?: string[];
  priorityIn?: string[];
  metadataEquals?: Record<string, string>;
};

export type AutomationAction =
  | { type: "CREATE_LEAD"; pipelineId?: string; stageId?: string; assignToUserId?: string }
  | { type: "UPDATE_STAGE"; stageId: string }
  | { type: "ASSIGN_OWNER"; userId: string }
  | { type: "DISPATCH_OWNER"; candidateUserIds: string[] }
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
  | { type: "MARK_LOST"; reason?: string }
  | {
      type: "NOTIFY_USER";
      userId: string;
      title: string;
      body?: string;
      entityType?: string;
      entityId?: string;
    }
  | {
      type: "OPEN_ESCALATION";
      reason: string;
      queueId?: string;
    }
  | {
      type: "ESCALATE_REASSIGN";
      newOwnerUserId: string;
      reason: string;
    }
  | {
      type: "ENQUEUE_DELAYED_EVENT";
      eventType: string;
      delayMinutes: number;
      dedupeKeySuffix?: string;
    };

export type AutomationActionConfig = {
  actions: AutomationAction[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringArray(raw: unknown): string[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const out = raw.filter((v): v is string => typeof v === "string");
  return out.length ? out : undefined;
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
  const sources = stringArray(raw.sources);
  if (sources) out.sources = sources;
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
  if (typeof raw.ownerIsNull === "boolean") out.ownerIsNull = raw.ownerIsNull;
  const ownershipSourceIn = stringArray(raw.ownershipSourceIn);
  if (ownershipSourceIn) out.ownershipSourceIn = ownershipSourceIn;
  const leadStatusIn = stringArray(raw.leadStatusIn);
  if (leadStatusIn) out.leadStatusIn = leadStatusIn;
  const registrationStatusIn = stringArray(raw.registrationStatusIn);
  if (registrationStatusIn) out.registrationStatusIn = registrationStatusIn;
  const paymentStatusIn = stringArray(raw.paymentStatusIn);
  if (paymentStatusIn) out.paymentStatusIn = paymentStatusIn;
  const slaStateIn = stringArray(raw.slaStateIn);
  if (slaStateIn) out.slaStateIn = slaStateIn;
  const queueIdIn = stringArray(raw.queueIdIn);
  if (queueIdIn) out.queueIdIn = queueIdIn;
  const priorityIn = stringArray(raw.priorityIn);
  if (priorityIn) out.priorityIn = priorityIn;
  if (isRecord(raw.metadataEquals)) {
    const entries: Record<string, string> = {};
    for (const [k, v] of Object.entries(raw.metadataEquals)) {
      if (typeof v === "string") entries[k] = v;
    }
    out.metadataEquals = entries;
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
      case "DISPATCH_OWNER": {
        const ids = stringArray(item.candidateUserIds);
        if (ids?.length) actions.push({ type, candidateUserIds: ids });
        break;
      }
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
      case "NOTIFY_USER":
        if (
          typeof item.userId === "string" &&
          item.userId.trim() &&
          typeof item.title === "string" &&
          item.title.trim()
        ) {
          actions.push({
            type,
            userId: item.userId.trim(),
            title: item.title.trim(),
            body: typeof item.body === "string" ? item.body : undefined,
            entityType: typeof item.entityType === "string" ? item.entityType : undefined,
            entityId: typeof item.entityId === "string" ? item.entityId : undefined,
          });
        }
        break;
      case "OPEN_ESCALATION":
        if (typeof item.reason === "string" && item.reason.trim()) {
          actions.push({
            type,
            reason: item.reason.trim(),
            queueId: typeof item.queueId === "string" ? item.queueId : undefined,
          });
        }
        break;
      case "ESCALATE_REASSIGN":
        if (
          typeof item.newOwnerUserId === "string" &&
          item.newOwnerUserId.trim() &&
          typeof item.reason === "string" &&
          item.reason.trim()
        ) {
          actions.push({
            type,
            newOwnerUserId: item.newOwnerUserId.trim(),
            reason: item.reason.trim(),
          });
        }
        break;
      case "ENQUEUE_DELAYED_EVENT":
        if (
          typeof item.eventType === "string" &&
          item.eventType.trim() &&
          typeof item.delayMinutes === "number" &&
          item.delayMinutes > 0
        ) {
          actions.push({
            type,
            eventType: item.eventType.trim(),
            delayMinutes: item.delayMinutes,
            dedupeKeySuffix:
              typeof item.dedupeKeySuffix === "string"
                ? item.dedupeKeySuffix
                : undefined,
          });
        }
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

export function actionIdempotencyKey(params: {
  ruleId: string;
  eventId: string;
  actionIndex: number;
  actionType: string;
}): string {
  return `auto:${params.ruleId}:${params.eventId}:${params.actionIndex}:${params.actionType}`;
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
  {
    code: "instagram_lead_dispatch",
    name: "لید اینستاگرام → تخصیص ظرفیت",
    description: "پس از ایجاد لید با منبع اینستاگرام، تخصیص از طریق Capacity Engine.",
    trigger: DomainEventType.LEAD_CREATED,
    conditions: { sources: ["Instagram", "اینستاگرام"], ownerIsNull: true },
    actionConfig: {
      actions: [{ type: "DISPATCH_OWNER", candidateUserIds: [] }],
    },
  },
  {
    code: "sla_breach_urgent",
    name: "نقض SLA → وظیفه فوری",
    description: "پس از SLA_BREACHED وظیفه فوری بسازید (اطلاع مدیر را با userId پیکربندی کنید).",
    trigger: DomainEventType.SLA_BREACHED,
    conditions: { slaStateIn: ["BREACHED"] },
    actionConfig: {
      actions: [
        {
          type: "CREATE_TASK",
          title: "فوری: نقض SLA",
          taskType: "FOLLOW_UP",
          priority: "URGENT",
          dueMinutes: 15,
        },
        {
          type: "OPEN_ESCALATION",
          reason: "SLA_BREACH",
          queueId: "SLA",
        },
      ],
    },
  },
  {
    code: "followup_due_task",
    name: "سررسید پیگیری → وظیفه",
    description: "پس از FOLLOWUP_DUE وظیفه پیگیری بسازید (جایگزین side-effect زمان‌بندی).",
    trigger: DomainEventType.FOLLOWUP_DUE,
    conditions: {},
    actionConfig: {
      actions: [
        {
          type: "CREATE_TASK",
          title: "یادآوری پیگیری",
          taskType: "FOLLOW_UP",
          dueMinutes: 30,
        },
      ],
    },
  },
];
