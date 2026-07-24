/**
 * Organization.settings JSON — typed parsers (backward-compatible).
 */

export const ORGANIZATION_SETTINGS_SCHEMA_VERSION = 1 as const;

export type RegistrationStageMappingConfig = {
  /** Stage code for registration draft / started */
  registrationStarted: string | null;
  /** Stage code while awaiting payment */
  paymentPending: string | null;
  /** Stage code after paid / free complete */
  registrationCompleted: string | null;
  /** Stage code when registration cancelled (optional) */
  registrationCancelled: string | null;
};

export type OrganizationSettings = {
  schemaVersion: typeof ORGANIZATION_SETTINGS_SCHEMA_VERSION;
  registrationStageMapping?: Partial<RegistrationStageMappingConfig> | null;
};

/** Defaults aligned with DEFAULT_STAGES in lib/crm/pipeline.ts */
export const DEFAULT_REGISTRATION_STAGE_MAPPING: RegistrationStageMappingConfig =
  {
    registrationStarted: "qualified",
    paymentPending: "decision",
    registrationCompleted: "won",
    registrationCancelled: null,
  };

export function emptyOrganizationSettings(
  overrides: Partial<OrganizationSettings> = {},
): OrganizationSettings {
  return {
    registrationStageMapping: null,
    ...overrides,
    schemaVersion: ORGANIZATION_SETTINGS_SCHEMA_VERSION,
  };
}

export function parseOrganizationSettings(
  value: unknown,
): OrganizationSettings {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return emptyOrganizationSettings();
  }
  const raw = value as Record<string, unknown>;
  const mappingRaw = raw.registrationStageMapping;
  let registrationStageMapping: Partial<RegistrationStageMappingConfig> | null =
    null;

  if (
    mappingRaw &&
    typeof mappingRaw === "object" &&
    !Array.isArray(mappingRaw)
  ) {
    const m = mappingRaw as Record<string, unknown>;
    const str = (key: string): string | null => {
      const v = m[key];
      if (typeof v !== "string") return null;
      const t = v.trim();
      return t.length > 0 ? t : null;
    };
    registrationStageMapping = {
      registrationStarted: str("registrationStarted"),
      paymentPending: str("paymentPending"),
      registrationCompleted: str("registrationCompleted"),
      registrationCancelled: str("registrationCancelled"),
    };
  }

  return {
    schemaVersion: ORGANIZATION_SETTINGS_SCHEMA_VERSION,
    registrationStageMapping,
  };
}

export function resolveRegistrationStageMapping(
  settings: OrganizationSettings | null | undefined,
): RegistrationStageMappingConfig {
  const partial = settings?.registrationStageMapping ?? null;
  return {
    registrationStarted:
      partial?.registrationStarted ??
      DEFAULT_REGISTRATION_STAGE_MAPPING.registrationStarted,
    paymentPending:
      partial?.paymentPending ??
      DEFAULT_REGISTRATION_STAGE_MAPPING.paymentPending,
    registrationCompleted:
      partial?.registrationCompleted ??
      DEFAULT_REGISTRATION_STAGE_MAPPING.registrationCompleted,
    registrationCancelled:
      partial?.registrationCancelled ??
      DEFAULT_REGISTRATION_STAGE_MAPPING.registrationCancelled,
  };
}

export function mergeOrganizationSettings(
  existing: unknown,
  patch: Partial<OrganizationSettings>,
): OrganizationSettings {
  const base = parseOrganizationSettings(existing);
  return {
    schemaVersion: ORGANIZATION_SETTINGS_SCHEMA_VERSION,
    registrationStageMapping:
      patch.registrationStageMapping !== undefined
        ? patch.registrationStageMapping
        : base.registrationStageMapping,
  };
}
