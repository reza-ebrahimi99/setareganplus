/** Cookie name for opaque admin session token (safe for Edge middleware). */
export const ADMIN_SESSION_COOKIE = "staros_admin_session" as const;

/** Absolute session lifetime (7 days). */
export const ADMIN_SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
