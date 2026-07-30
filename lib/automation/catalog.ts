import { DomainEventType } from "@/generated/prisma/enums";

export const AUTOMATION_EVENT_CATALOG: ReadonlyArray<{
  eventType: DomainEventType;
  aggregateType: string;
  description: string;
}> = [
  {
    eventType: DomainEventType.LEAD_CREATED,
    aggregateType: "Lead",
    description: "Lead created (any intake path)",
  },
  {
    eventType: DomainEventType.LEAD_ASSIGNED,
    aggregateType: "Lead",
    description: "Lead gained an owner (was null)",
  },
  {
    eventType: DomainEventType.LEAD_REASSIGNED,
    aggregateType: "Lead",
    description: "Lead owner changed",
  },
  {
    eventType: DomainEventType.FOLLOWUP_DUE,
    aggregateType: "Lead",
    description: "Follow-up clock fired",
  },
  {
    eventType: DomainEventType.CALL_LOGGED,
    aggregateType: "CrmCallLog",
    description: "Call log recorded",
  },
  {
    eventType: DomainEventType.REGISTRATION_CREATED,
    aggregateType: "Registration",
    description: "Registration created",
  },
  {
    eventType: DomainEventType.PAYMENT_SUCCESS,
    aggregateType: "PaymentIntent",
    description: "Payment verified PAID",
  },
  {
    eventType: DomainEventType.PAYMENT_FAILED,
    aggregateType: "PaymentIntent",
    description: "Payment failed",
  },
  {
    eventType: DomainEventType.SLA_BREACHED,
    aggregateType: "Lead",
    description: "SLA clock breached",
  },
  {
    eventType: DomainEventType.QUEUE_ITEM_ESCALATED,
    aggregateType: "OpsEscalation",
    description: "Ops escalation opened",
  },
];
