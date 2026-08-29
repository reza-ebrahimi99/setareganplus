/** Cookie name for opaque admin session token (safe for Edge middleware). */
export const ADMIN_SESSION_COOKIE = "staros_admin_session" as const;

/** Opaque portal session token (Student / Parent). Separate from admin. */
export const PORTAL_SESSION_COOKIE = "staros_portal_session" as const;

/** Active portal account-link preference (validated server-side every request). */
export const PORTAL_ACTIVE_LINK_COOKIE = "staros_portal_active_link" as const;

/** Absolute session lifetime (7 days). */
export const ADMIN_SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export const PORTAL_SESSION_TTL_MS = ADMIN_SESSION_TTL_MS;
