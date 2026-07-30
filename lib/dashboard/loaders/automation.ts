import {
  readAutomationActivitySummary,
  readStaffNotificationSummary,
} from "@/lib/automation/reads";
import type { DashboardComposeContext } from "@/lib/dashboard/contracts/widget";

export async function loadAutomationActivity(ctx: DashboardComposeContext) {
  return readAutomationActivitySummary({
    organizationId: ctx.organizationId,
  });
}

export async function loadAutomationNotifications(
  ctx: DashboardComposeContext,
) {
  return readStaffNotificationSummary({
    organizationId: ctx.organizationId,
    userId: ctx.viewerUserId,
    limit: 5,
  });
}
