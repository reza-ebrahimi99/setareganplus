/**
 * Compatibility shim — Sprint 5 moved the contract to lib/automation.
 */
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
