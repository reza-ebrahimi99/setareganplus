/** Public hostname routing for the isolated campaign application. */
export const CHALLENGE_PUBLIC_HOST = "challenge.setareganplus.ir";
export const CHALLENGE_APP_PREFIX = "/challenge";

export function normalizeChallengeHost(host: string | null | undefined): string {
  return (host ?? "").toLowerCase().split(":")[0] ?? "";
}

export function isChallengeHost(host: string | null | undefined): boolean {
  const normalized = normalizeChallengeHost(host);
  if (!normalized) return false;
  const configured = process.env.CHALLENGE_HOST?.toLowerCase().trim();
  if (configured) return normalized === configured;
  return (
    normalized === CHALLENGE_PUBLIC_HOST ||
    normalized === "challenge.localhost" ||
    normalized.startsWith("challenge.127.0.0.1")
  );
}

export function getChallengePublicOrigin(): string {
  const configured = process.env.NEXT_PUBLIC_CHALLENGE_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");
  const host = process.env.CHALLENGE_HOST?.trim() || CHALLENGE_PUBLIC_HOST;
  return `https://${host}`;
}
