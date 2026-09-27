import { prisma } from "@/lib/prisma";
import { getPublicOrganizationBySlug } from "@/lib/organizations/get-current-organization";

export function readAcademyEnvInt(name: string, fallback: number): number {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function academyPlaybackTokenTtlSeconds(): number {
  return readAcademyEnvInt("ACADEMY_PLAYBACK_TOKEN_TTL_SECONDS", 300);
}

export function academyMaxDevicesEnv(): number {
  return readAcademyEnvInt("ACADEMY_MAX_DEVICES", 2);
}

export function academyMaxConcurrentStreamsEnv(): number {
  return readAcademyEnvInt("ACADEMY_MAX_CONCURRENT_STREAMS", 1);
}

export async function getAcademyOrganizationId(): Promise<string> {
  const org = await getPublicOrganizationBySlug();
  return org.id;
}

export async function getAcademySettings(organizationId: string) {
  const existing = await prisma.academySettings.findUnique({
    where: { organizationId },
  });
  if (existing) return existing;

  return prisma.academySettings.create({
    data: {
      organizationId,
      maxDevices: academyMaxDevicesEnv(),
      maxConcurrentStreams: academyMaxConcurrentStreamsEnv(),
    },
  });
}
