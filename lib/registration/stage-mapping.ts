/**
 * Configurable Registration → CRM stage mapping.
 * Reads Organization.settings.registrationStageMapping with DEFAULT_STAGES fallback.
 */

import { changeLeadStage } from "@/lib/crm/leads";
import { ensureDefaultPipeline } from "@/lib/crm/pipeline";
import {
  parseOrganizationSettings,
  resolveRegistrationStageMapping,
  type RegistrationStageMappingConfig,
} from "@/lib/organizations/settings";
import { prisma } from "@/lib/prisma";

export type RegistrationStagePhase =
  | "registrationStarted"
  | "paymentPending"
  | "registrationCompleted"
  | "registrationCancelled";

/** Map legacy lead-link phases → config keys */
export function legacyPhaseToMappingKey(
  phase: "started" | "payment_pending" | "registered" | "cancelled",
): RegistrationStagePhase {
  switch (phase) {
    case "started":
      return "registrationStarted";
    case "payment_pending":
      return "paymentPending";
    case "registered":
      return "registrationCompleted";
    case "cancelled":
      return "registrationCancelled";
  }
}

export async function loadRegistrationStageMapping(
  organizationId: string,
): Promise<RegistrationStageMappingConfig> {
  const org = await prisma.organization.findFirst({
    where: { id: organizationId, deletedAt: null },
    select: { settings: true },
  });
  return resolveRegistrationStageMapping(
    parseOrganizationSettings(org?.settings),
  );
}

/**
 * Resolve target stage id for a registration lifecycle phase.
 * Returns null + logs warning when configured/fallback code is missing.
 */
export async function resolveStageIdForRegistrationPhase(params: {
  organizationId: string;
  phase: RegistrationStagePhase;
}): Promise<{ stageId: string; stageCode: string } | null> {
  const mapping = await loadRegistrationStageMapping(params.organizationId);
  const configuredCode = mapping[params.phase];
  if (!configuredCode) {
    if (params.phase === "registrationCancelled") {
      return null;
    }
    console.warn(
      `[registration-stage-mapping] No stage code configured for ${params.phase} (org=${params.organizationId})`,
    );
    return null;
  }

  const pipeline = await ensureDefaultPipeline(params.organizationId);
  const stageId = pipeline.stageByCode[configuredCode];
  if (!stageId) {
    console.warn(
      `[registration-stage-mapping] Stage code "${configuredCode}" missing on default pipeline for ${params.phase} (org=${params.organizationId}). Registration continues without stage change.`,
    );
    return null;
  }

  return { stageId, stageCode: configuredCode };
}

/**
 * Advance CRM stage for registration lifecycle. Non-destructive:
 * missing stage → warning log only; registration/payment still succeed.
 */
export async function advanceLeadStageForRegistrationPhase(params: {
  organizationId: string;
  leadId: string;
  phase: RegistrationStagePhase;
}): Promise<{ advanced: boolean; stageCode: string | null }> {
  const resolved = await resolveStageIdForRegistrationPhase({
    organizationId: params.organizationId,
    phase: params.phase,
  });
  if (!resolved) {
    return { advanced: false, stageCode: null };
  }

  await changeLeadStage({
    organizationId: params.organizationId,
    leadId: params.leadId,
    stageId: resolved.stageId,
  });
  return { advanced: true, stageCode: resolved.stageCode };
}
