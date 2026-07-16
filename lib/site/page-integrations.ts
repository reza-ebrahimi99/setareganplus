/**
 * Stable site-page form/booking slug configuration.
 * Prefer NEXT_PUBLIC_* for optional client awareness; server reads either.
 */

function readEnv(...keys: string[]): string | null {
  for (const key of keys) {
    const value = process.env[key]?.trim();
    if (value) {
      return value;
    }
  }
  return null;
}

export function getPreRegistrationFormSlug(): string | null {
  return readEnv(
    "NEXT_PUBLIC_PRE_REGISTRATION_FORM_SLUG",
    "PRE_REGISTRATION_FORM_SLUG",
  );
}

export function getConsultationFormSlug(): string | null {
  return readEnv(
    "NEXT_PUBLIC_CONSULTATION_FORM_SLUG",
    "CONSULTATION_FORM_SLUG",
  );
}

export function getConsultationBookingServiceSlug(): string | null {
  return readEnv(
    "NEXT_PUBLIC_CONSULTATION_BOOKING_SERVICE_SLUG",
    "CONSULTATION_BOOKING_SERVICE_SLUG",
  );
}
