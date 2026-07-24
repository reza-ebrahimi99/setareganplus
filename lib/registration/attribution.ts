/**
 * Campaign Attribution & Marketing Tracking for Registration.
 * Stored on Registration.metadata (and wizard draft / localStorage).
 * Designed so future ad pixels / GTM / affiliates can plug in without refactor.
 */

export const ACQUISITION_SOURCES = [
  "utm",
  "referral",
  "qr",
  "manual",
  "direct",
] as const;

export type AcquisitionSourceKind = (typeof ACQUISITION_SOURCES)[number];

/** Operator-selectable manual channels when no URL attribution exists. */
export const MANUAL_ACQUISITION_CHANNELS = [
  "Instagram",
  "Bale",
  "Google",
  "SMS",
  "Website",
  "Phone Call",
  "Walk In",
  "Friend",
  "Parent",
  "School",
  "Campaign",
  "Other",
] as const;

export type ManualAcquisitionChannel =
  (typeof MANUAL_ACQUISITION_CHANNELS)[number];

/** Bump when attribution shape changes incompatibly. Unversioned rows read as v1. */
export const ATTRIBUTION_SCHEMA_VERSION = 1 as const;

/**
 * Canonical attribution snapshot persisted on Registration.metadata.attribution
 * and mirrored at top-level keys for report convenience (see toRegistrationAttributionFlat).
 */
export type RegistrationAttribution = {
  /** Schema version for forward-compatible reads (optional on legacy rows). */
  schemaVersion?: typeof ATTRIBUTION_SCHEMA_VERSION;
  /** Resolved primary source kind (priority: utm > referral > qr > manual > direct). */
  acquisitionSource: AcquisitionSourceKind;
  /** Human / channel medium (e.g. story, cpc, referral, qr, phone). */
  acquisitionMedium: string | null;
  /** Campaign name (utm_campaign or referral/qr campaign). */
  campaign: string | null;
  referralCode: string | null;
  referralOwner: string | null;
  referralLink: string | null;
  referralCampaign: string | null;
  qrCampaign: string | null;
  qrIdentifier: string | null;
  qrOwner: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmContent: string | null;
  utmTerm: string | null;
  landingPage: string | null;
  firstVisitAt: string | null;
  /** Optional manual override chosen by operator / parent. */
  manualSource: ManualAcquisitionChannel | string | null;
  /**
   * Extensible bag for future Facebook Ads, GA, GTM, TikTok, affiliate, etc.
   * Never required by core engine.
   */
  extensions?: Record<string, string | number | boolean | null>;
};

export type AttributionUrlParams = {
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  utm_content?: string | null;
  utm_term?: string | null;
  /** Referral code */
  ref?: string | null;
  /** Explicit QR markers */
  qr?: string | null;
  qr_campaign?: string | null;
  qr_id?: string | null;
  qr_owner?: string | null;
  /** Alias used by some share links */
  src?: string | null;
};

function trimOrNull(value: string | null | undefined): string | null {
  if (value == null) return null;
  const t = String(value).trim();
  return t.length > 0 ? t : null;
}

function upperOrNull(value: string | null | undefined): string | null {
  const t = trimOrNull(value);
  return t ? t.toUpperCase() : null;
}

export function emptyAttribution(
  overrides: Partial<RegistrationAttribution> = {},
): RegistrationAttribution {
  return {
    acquisitionSource: "direct",
    acquisitionMedium: null,
    campaign: null,
    referralCode: null,
    referralOwner: null,
    referralLink: null,
    referralCampaign: null,
    qrCampaign: null,
    qrIdentifier: null,
    qrOwner: null,
    utmSource: null,
    utmMedium: null,
    utmCampaign: null,
    utmContent: null,
    utmTerm: null,
    landingPage: null,
    firstVisitAt: null,
    manualSource: null,
    extensions: {},
    ...overrides,
    schemaVersion: ATTRIBUTION_SCHEMA_VERSION,
  };
}

/**
 * Strip client-spoofable identity fields. Referral owner / QR owner names
 * must be resolved server-side from promotion / staff records.
 */
export function sanitizeClientAttribution(
  value: RegistrationAttribution | null | undefined,
): RegistrationAttribution | null {
  if (!value) return null;
  const parsed = parseAttributionFromUnknown(value);
  if (!parsed) return null;
  return {
    ...parsed,
    schemaVersion: ATTRIBUTION_SCHEMA_VERSION,
    referralOwner: null,
    qrOwner: null,
  };
}

export function attributionStorageKey(flowKey: string): string {
  return `reg-attribution-${flowKey}`;
}

/**
 * Priority: UTM → Referral → QR → Manual → Direct
 */
export function resolveAcquisitionSource(
  attr: Pick<
    RegistrationAttribution,
    | "utmSource"
    | "referralCode"
    | "qrCampaign"
    | "qrIdentifier"
    | "manualSource"
  >,
): AcquisitionSourceKind {
  if (attr.utmSource) return "utm";
  if (attr.referralCode) return "referral";
  if (attr.qrCampaign || attr.qrIdentifier) return "qr";
  if (attr.manualSource) return "manual";
  return "direct";
}

export function detectAttributionFromUrl(params: {
  searchParams: AttributionUrlParams | URLSearchParams | Record<string, string | string[] | undefined>;
  landingPage?: string | null;
  referralLink?: string | null;
  now?: Date;
}): RegistrationAttribution {
  const read = (key: string): string | null => {
    const sp = params.searchParams;
    if (sp instanceof URLSearchParams) {
      return trimOrNull(sp.get(key));
    }
    const raw = (sp as Record<string, unknown>)[key];
    if (Array.isArray(raw)) return trimOrNull(raw[0]);
    if (typeof raw === "string") return trimOrNull(raw);
    return null;
  };

  const utmSource = read("utm_source");
  const utmMedium = read("utm_medium");
  const utmCampaign = read("utm_campaign");
  const utmContent = read("utm_content");
  const utmTerm = read("utm_term");
  const ref = upperOrNull(read("ref"));
  const qrFlag = read("qr");
  const qrCampaign = read("qr_campaign") ?? (qrFlag === "1" || qrFlag === "true" ? "qr" : null);
  const qrIdentifier = read("qr_id") ?? (qrFlag && qrFlag !== "1" && qrFlag !== "true" ? qrFlag : null);
  const qrOwner = read("qr_owner");

  const draft = emptyAttribution({
    utmSource,
    utmMedium,
    utmCampaign,
    utmContent,
    utmTerm,
    referralCode: ref,
    referralLink: params.referralLink ?? null,
    referralCampaign: ref ? utmCampaign ?? "referral" : null,
    qrCampaign,
    qrIdentifier,
    qrOwner,
    landingPage: trimOrNull(params.landingPage),
    firstVisitAt: (params.now ?? new Date()).toISOString(),
    campaign: utmCampaign ?? (ref ? "referral" : qrCampaign),
  });

  draft.acquisitionSource = resolveAcquisitionSource(draft);
  draft.acquisitionMedium =
    draft.utmMedium ??
    (draft.acquisitionSource === "referral"
      ? "referral"
      : draft.acquisitionSource === "qr"
        ? "qr"
        : draft.acquisitionSource === "utm"
          ? "utm"
          : null);

  return draft;
}

/**
 * First-touch wins for UTM/referral/QR; manual can fill gaps later.
 * firstVisitAt / landingPage never overwritten once set.
 */
export function mergeAttributionFirstTouch(
  existing: RegistrationAttribution | null | undefined,
  incoming: RegistrationAttribution,
): RegistrationAttribution {
  if (!existing) return { ...incoming };

  const merged = emptyAttribution({
    ...existing,
    utmSource: existing.utmSource ?? incoming.utmSource,
    utmMedium: existing.utmMedium ?? incoming.utmMedium,
    utmCampaign: existing.utmCampaign ?? incoming.utmCampaign,
    utmContent: existing.utmContent ?? incoming.utmContent,
    utmTerm: existing.utmTerm ?? incoming.utmTerm,
    referralCode: existing.referralCode ?? incoming.referralCode,
    referralOwner: existing.referralOwner ?? incoming.referralOwner,
    referralLink: existing.referralLink ?? incoming.referralLink,
    referralCampaign: existing.referralCampaign ?? incoming.referralCampaign,
    qrCampaign: existing.qrCampaign ?? incoming.qrCampaign,
    qrIdentifier: existing.qrIdentifier ?? incoming.qrIdentifier,
    qrOwner: existing.qrOwner ?? incoming.qrOwner,
    landingPage: existing.landingPage ?? incoming.landingPage,
    firstVisitAt: existing.firstVisitAt ?? incoming.firstVisitAt,
    manualSource: incoming.manualSource ?? existing.manualSource,
    campaign:
      existing.campaign ??
      incoming.campaign ??
      existing.utmCampaign ??
      incoming.utmCampaign,
    extensions: {
      ...(existing.extensions ?? {}),
      ...(incoming.extensions ?? {}),
    },
  });

  merged.acquisitionSource = resolveAcquisitionSource(merged);
  merged.acquisitionMedium =
    merged.utmMedium ??
    (merged.acquisitionSource === "referral"
      ? "referral"
      : merged.acquisitionSource === "qr"
        ? "qr"
        : merged.acquisitionSource === "manual"
          ? "manual"
          : merged.acquisitionSource === "utm"
            ? "utm"
            : "direct");

  return merged;
}

export function applyManualAcquisitionSource(
  existing: RegistrationAttribution | null | undefined,
  manualSource: string | null,
): RegistrationAttribution {
  const base = existing ?? emptyAttribution({ firstVisitAt: new Date().toISOString() });
  const next = {
    ...base,
    manualSource: trimOrNull(manualSource),
  };
  // Manual only becomes primary when higher-priority sources are absent.
  next.acquisitionSource = resolveAcquisitionSource(next);
  if (next.acquisitionSource === "manual") {
    next.acquisitionMedium = "manual";
    next.campaign = next.campaign ?? next.manualSource;
  }
  return next;
}

export function parseAttributionFromUnknown(
  value: unknown,
): RegistrationAttribution | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  const nested =
    raw.attribution && typeof raw.attribution === "object" && !Array.isArray(raw.attribution)
      ? (raw.attribution as Record<string, unknown>)
      : raw;

  const str = (key: string): string | null => {
    const v = nested[key] ?? raw[key];
    return typeof v === "string" && v.trim() ? v.trim() : null;
  };

  const versionRaw = nested.schemaVersion ?? raw.schemaVersion;
  const schemaVersion =
    typeof versionRaw === "number" && Number.isFinite(versionRaw)
      ? Math.trunc(versionRaw)
      : ATTRIBUTION_SCHEMA_VERSION;

  const attr = emptyAttribution({
    schemaVersion: ATTRIBUTION_SCHEMA_VERSION,
    acquisitionSource: (str("acquisitionSource") as AcquisitionSourceKind) || "direct",
    acquisitionMedium: str("acquisitionMedium"),
    campaign: str("campaign"),
    referralCode: str("referralCode"),
    referralOwner: str("referralOwner"),
    referralLink: str("referralLink"),
    referralCampaign: str("referralCampaign"),
    qrCampaign: str("qrCampaign"),
    qrIdentifier: str("qrIdentifier"),
    qrOwner: str("qrOwner"),
    utmSource: str("utmSource"),
    utmMedium: str("utmMedium"),
    utmCampaign: str("utmCampaign"),
    utmContent: str("utmContent"),
    utmTerm: str("utmTerm"),
    landingPage: str("landingPage"),
    firstVisitAt: str("firstVisitAt"),
    manualSource: str("manualSource"),
  });

  // Legacy unversioned / future-known versions still parse; unknown future kept as current.
  if (schemaVersion > 0) {
    attr.schemaVersion = ATTRIBUTION_SCHEMA_VERSION;
  }

  if (
    !ACQUISITION_SOURCES.includes(attr.acquisitionSource as AcquisitionSourceKind)
  ) {
    attr.acquisitionSource = resolveAcquisitionSource(attr);
  }

  return attr;
}

/** Flat keys required by the product spec for Registration.metadata */
export function toRegistrationAttributionFlat(
  attr: RegistrationAttribution,
): Record<string, string | null> {
  return {
    acquisitionSource: attr.acquisitionSource,
    acquisitionMedium: attr.acquisitionMedium,
    campaign: attr.campaign,
    referralCode: attr.referralCode,
    referralOwner: attr.referralOwner,
    qrCampaign: attr.qrCampaign,
    utmSource: attr.utmSource,
    utmMedium: attr.utmMedium,
    utmCampaign: attr.utmCampaign,
    utmContent: attr.utmContent,
    utmTerm: attr.utmTerm,
    landingPage: attr.landingPage,
    firstVisitAt: attr.firstVisitAt,
  };
}

export function attributionToMetadataPatch(
  attr: RegistrationAttribution,
): Record<string, unknown> {
  const versioned: RegistrationAttribution = {
    ...attr,
    schemaVersion: attr.schemaVersion ?? ATTRIBUTION_SCHEMA_VERSION,
  };
  return {
    attribution: versioned,
    attributionSchemaVersion: versioned.schemaVersion,
    ...toRegistrationAttributionFlat(versioned),
    referralLink: versioned.referralLink,
    referralCampaign: versioned.referralCampaign,
    qrIdentifier: versioned.qrIdentifier,
    qrOwner: versioned.qrOwner,
    manualSource: versioned.manualSource,
  };
}
