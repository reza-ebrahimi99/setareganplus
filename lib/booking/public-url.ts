import { PUBLIC_SITE_ORIGIN } from "@/lib/forms/public-form-url";

export function getPublicBookingPath(serviceSlug: string): string {
  return `/book/${serviceSlug}`;
}

export function getPublicBookingUrl(serviceSlug: string): string {
  return `${PUBLIC_SITE_ORIGIN}${getPublicBookingPath(serviceSlug)}`;
}

export function getBookingConfirmationPath(
  serviceSlug: string,
  trackingCode: string,
): string {
  return `/book/${serviceSlug}/confirmation/${encodeURIComponent(trackingCode)}`;
}
