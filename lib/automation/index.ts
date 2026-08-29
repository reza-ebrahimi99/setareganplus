export { AUTOMATION_EVENT_CATALOG } from "@/lib/automation/catalog";
export { isAutomationClockCutoverEnabled } from "@/lib/automation/cutover";
export { enqueueDomainEvent } from "@/lib/automation/enqueue";
export {
  assertOwnershipActionAllowed,
  isAutomationOwnershipEcho,
  isLeadReassignmentCircuitOpen,
} from "@/lib/automation/loop-guard";
export {
  readAutomationActivitySummary,
  readStaffNotificationSummary,
} from "@/lib/automation/reads";
export { reclaimStaleProcessingEvents } from "@/lib/automation/pipeline";
export {
  AUTOMATION_ACTION_TYPES,
  AUTOMATION_PRESETS,
  actionIdempotencyKey,
  isKnownDomainEventType,
  parseAutomationActionConfig,
  parseAutomationConditions,
  validateAutomationActionConfig,
  type AutomationAction,
  type AutomationActionConfig,
  type AutomationActionType,
  type AutomationConditions,
} from "@/lib/automation/rules/contract";
export { ruleTriggersForEvent } from "@/lib/automation/triggers/aliases";
export {
  claimPendingDomainEvents,
  processDomainEvent,
  processPendingAutomationBatch,
} from "@/lib/automation/worker";
