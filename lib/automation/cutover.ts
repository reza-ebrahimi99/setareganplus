/**
 * Clock cutover — Phase C complete (Sprint 6.6).
 *
 * Default ON: scheduled/ops workers emit clock events only (no direct
 * follow-up tasks / SLA escalations). Opt out with
 * STAROS_AUTOMATION_CLOCK_CUTOVER=0 for emergency dual-run rollback.
 */
export function isAutomationClockCutoverEnabled(): boolean {
  const raw = process.env.STAROS_AUTOMATION_CLOCK_CUTOVER?.trim().toLowerCase();
  if (raw === "0" || raw === "false" || raw === "no" || raw === "off") {
    return false;
  }
  // Default Phase C: cutover enabled
  return true;
}
