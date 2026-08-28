/**
 * Compatibility shim — Sprint 5 moved the processor to lib/automation.
 */
export {
  claimPendingDomainEvents,
  processDomainEvent,
  processPendingAutomationBatch,
} from "@/lib/automation/pipeline";
