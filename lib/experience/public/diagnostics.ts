/**
 * Structured server diagnostics for Experience public rendering.
 * Never log applicant PII or full stack traces to clients.
 */

export type ExperienceRenderDiagnosticCategory =
  | "BLOCK_SKIPPED"
  | "BLOCK_RENDER_FAILED"
  | "REGISTRATION_FORM_UNAVAILABLE"
  | "NO_RENDERABLE_BLOCKS"
  | "EXPERIENCE_FALLBACK"
  | "UNKNOWN_BLOCK_TYPE"
  | "INVALID_CONFIG";

export type ExperienceRenderDiagnostic = {
  category: ExperienceRenderDiagnosticCategory;
  message: string;
  organizationId?: string;
  registrationFlowId?: string;
  experienceId?: string;
  versionId?: string;
  blockId?: string;
  blockType?: string;
  reason?: string;
};

export function logExperienceRenderDiagnostic(
  diagnostic: ExperienceRenderDiagnostic,
): void {
  console.error("[experience.public.render]", {
    category: diagnostic.category,
    message: diagnostic.message,
    organizationId: diagnostic.organizationId,
    registrationFlowId: diagnostic.registrationFlowId,
    experienceId: diagnostic.experienceId,
    versionId: diagnostic.versionId,
    blockId: diagnostic.blockId,
    blockType: diagnostic.blockType,
    reason: diagnostic.reason,
  });
}
