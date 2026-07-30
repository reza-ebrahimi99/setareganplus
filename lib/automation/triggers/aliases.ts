import { DomainEventType } from "@/generated/prisma/enums";

/**
 * Inbound event types that should also match rules subscribed to `canonical`.
 * Prefer aliases over dual-emitting forever.
 */
const ALIAS_TO_CANONICAL: Readonly<Partial<Record<DomainEventType, DomainEventType>>> =
  {
    [DomainEventType.FORM_LEAD_CREATED]: DomainEventType.LEAD_CREATED,
  };

/**
 * Returns trigger values to load rules for, given an inbound outbox event type.
 * Always includes the inbound type; may include canonical aliases.
 */
export function ruleTriggersForEvent(
  inbound: DomainEventType,
): DomainEventType[] {
  const canonical = ALIAS_TO_CANONICAL[inbound];
  if (!canonical || canonical === inbound) return [inbound];
  return [inbound, canonical];
}

export function isAliasOfLeadCreated(eventType: DomainEventType): boolean {
  return (
    eventType === DomainEventType.LEAD_CREATED ||
    eventType === DomainEventType.FORM_LEAD_CREATED
  );
}
