/**
 * Referral deep-link helpers for Registration wizard.
 * Manual discount code always wins over URL ?ref= once the user applies a code.
 */

import {
  getPublicRegistrationFlowPath,
  getPublicRegistrationWizardPath,
  PUBLIC_SITE_ORIGIN,
} from "@/lib/registration/flows/public-url";

export function normalizeReferralCode(raw: string | null | undefined): string {
  return (raw ?? "").trim().toUpperCase();
}

export function referralStorageKey(flowKey: string): string {
  return `reg-ref-${flowKey}`;
}

export function getPublicReferralFlowPath(
  flowSlug: string,
  code: string,
  utm?: {
    utm_source?: string | null;
    utm_medium?: string | null;
    utm_campaign?: string | null;
  },
): string {
  const normalized = normalizeReferralCode(code);
  const base = getPublicRegistrationFlowPath(flowSlug);
  const params = new URLSearchParams();
  if (normalized) params.set("ref", normalized);
  if (utm?.utm_source?.trim()) params.set("utm_source", utm.utm_source.trim());
  if (utm?.utm_medium?.trim()) params.set("utm_medium", utm.utm_medium.trim());
  if (utm?.utm_campaign?.trim())
    params.set("utm_campaign", utm.utm_campaign.trim());
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}

export function getPublicReferralWizardPath(
  flowSlug: string,
  code: string,
  utm?: {
    utm_source?: string | null;
    utm_medium?: string | null;
    utm_campaign?: string | null;
  },
): string {
  const normalized = normalizeReferralCode(code);
  const base = getPublicRegistrationWizardPath(flowSlug);
  const params = new URLSearchParams();
  if (normalized) params.set("ref", normalized);
  if (utm?.utm_source?.trim()) params.set("utm_source", utm.utm_source.trim());
  if (utm?.utm_medium?.trim()) params.set("utm_medium", utm.utm_medium.trim());
  if (utm?.utm_campaign?.trim())
    params.set("utm_campaign", utm.utm_campaign.trim());
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}

export function getPublicReferralFlowUrl(
  flowSlug: string,
  code: string,
  utm?: {
    utm_source?: string | null;
    utm_medium?: string | null;
    utm_campaign?: string | null;
  },
): string {
  return `${PUBLIC_SITE_ORIGIN}${getPublicReferralFlowPath(flowSlug, code, utm)}`;
}

export function getPublicReferralWizardUrl(
  flowSlug: string,
  code: string,
  utm?: {
    utm_source?: string | null;
    utm_medium?: string | null;
    utm_campaign?: string | null;
  },
): string {
  return `${PUBLIC_SITE_ORIGIN}${getPublicReferralWizardPath(flowSlug, code, utm)}`;
}

/**
 * Resolve redeem code priority:
 * 1) Manual code (user applied / typed and confirmed)
 * 2) URL / stored referral ref
 */
export function resolveRedeemCodePriority(params: {
  manualCode?: string | null;
  referralRef?: string | null;
}): { code: string | null; source: "manual" | "referral" | null } {
  const manual = normalizeReferralCode(params.manualCode);
  if (manual) return { code: manual, source: "manual" };
  const ref = normalizeReferralCode(params.referralRef);
  if (ref) return { code: ref, source: "referral" };
  return { code: null, source: null };
}
