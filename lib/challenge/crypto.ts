import { createHash, randomBytes } from "node:crypto";

export function createChallengeToken(bytes = 24): string {
  return randomBytes(bytes).toString("base64url");
}

export function hashChallengeToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function shortChallengeCode(length = 8): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(length);
  let output = "";
  for (let i = 0; i < length; i += 1) {
    output += alphabet[bytes[i]! % alphabet.length];
  }
  return output;
}

export function privacyHash(value: string | null | undefined): string | null {
  const normalized = value?.trim();
  if (!normalized) return null;
  const pepper = process.env.CHALLENGE_HASH_PEPPER?.trim() || "challenge-v1";
  return createHash("sha256")
    .update(pepper)
    .update("\0")
    .update(normalized)
    .digest("hex")
    .slice(0, 32);
}

export function seededShuffle<T>(items: readonly T[], seed: string): T[] {
  const output = [...items];
  let counter = 0;
  for (let index = output.length - 1; index > 0; index -= 1) {
    const digest = createHash("sha256")
      .update(seed)
      .update(":")
      .update(String(counter++))
      .digest();
    const random = digest.readUInt32BE(0);
    const target = random % (index + 1);
    [output[index], output[target]] = [output[target]!, output[index]!];
  }
  return output;
}

