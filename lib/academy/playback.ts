import { createHash } from "node:crypto";
import { AcademySecurityEventType } from "@/generated/prisma/enums";
import { createSessionToken, hashSessionToken } from "@/lib/auth/crypto";
import { canUserAccessLesson } from "@/lib/academy/access";
import {
  academyPlaybackTokenTtlSeconds,
  getAcademySettings,
} from "@/lib/academy/config";
import { registerUserDevice, assertDeviceLimits } from "@/lib/academy/devices";
import { logAcademySecurityEvent } from "@/lib/academy/security";
import { prisma } from "@/lib/prisma";

export type CreatePlaybackSessionResult =
  | {
      ok: true;
      sessionId: string;
      playbackToken: string;
      expiresAt: Date;
      manifestUrl: string;
    }
  | { ok: false; error: string; code: string };

function hashIp(ip: string | null | undefined): string | null {
  if (!ip) return null;
  return createHash("sha256").update(ip).digest("hex").slice(0, 32);
}

export async function createPlaybackSession(params: {
  organizationId: string;
  userId: string;
  lessonId: string;
  deviceKey?: string | null;
  userAgent?: string | null;
  ipAddress?: string | null;
}): Promise<CreatePlaybackSessionResult> {
  const access = await canUserAccessLesson({
    organizationId: params.organizationId,
    userId: params.userId,
    lessonId: params.lessonId,
  });

  if (!access.allowed) {
    await logAcademySecurityEvent({
      organizationId: params.organizationId,
      userId: params.userId,
      type: AcademySecurityEventType.ENTITLEMENT_DENIED,
      lessonId: params.lessonId,
      metadata: { reason: access.reason },
    });
    return { ok: false, error: "دسترسی به این درس مجاز نیست.", code: access.reason };
  }

  const settings = await getAcademySettings(params.organizationId);

  if (params.deviceKey) {
    const deviceCheck = await assertDeviceLimits({
      organizationId: params.organizationId,
      userId: params.userId,
      deviceKey: params.deviceKey,
      maxDevices: settings.maxDevices,
    });
    if (!deviceCheck.ok) {
      await logAcademySecurityEvent({
        organizationId: params.organizationId,
        userId: params.userId,
        type: AcademySecurityEventType.DEVICE_LIMIT_REACHED,
        lessonId: params.lessonId,
      });
      return { ok: false, error: deviceCheck.error, code: "DEVICE_LIMIT" };
    }
    await registerUserDevice({
      organizationId: params.organizationId,
      userId: params.userId,
      deviceKey: params.deviceKey,
      userAgent: params.userAgent,
    });
  }

  const activeSessions = await prisma.academyPlaybackSession.count({
    where: {
      organizationId: params.organizationId,
      userId: params.userId,
      revokedAt: null,
      endedAt: null,
      lastHeartbeatAt: { gte: new Date(Date.now() - 90_000) },
    },
  });

  if (activeSessions >= settings.maxConcurrentStreams) {
    await logAcademySecurityEvent({
      organizationId: params.organizationId,
      userId: params.userId,
      type: AcademySecurityEventType.CONCURRENT_PLAYBACK_BLOCKED,
      lessonId: params.lessonId,
    });
    return {
      ok: false,
      error: "پخش هم‌زمان در دستگاه دیگر فعال است. ابتدا تماشای قبلی را متوقف کنید.",
      code: "CONCURRENT",
    };
  }

  const playbackToken = createSessionToken();
  const sessionTokenHash = hashSessionToken(playbackToken);
  const ttlSec = academyPlaybackTokenTtlSeconds();
  const expiresAt = new Date(Date.now() + ttlSec * 1000);

  const lesson = await prisma.academyLesson.findFirst({
    where: {
      id: params.lessonId,
      organizationId: params.organizationId,
    },
    select: {
      videoAsset: { select: { hlsStoragePrefix: true } },
    },
  });

  const session = await prisma.academyPlaybackSession.create({
    data: {
      organizationId: params.organizationId,
      userId: params.userId,
      lessonId: params.lessonId,
      deviceId: params.deviceKey ?? null,
      sessionTokenHash,
      ipHash: hashIp(params.ipAddress),
      userAgent: params.userAgent?.slice(0, 500) ?? null,
    },
    select: { id: true },
  });

  const qs = `token=${encodeURIComponent(playbackToken)}&session=${encodeURIComponent(session.id)}`;
  const manifestUrl = lesson?.videoAsset?.hlsStoragePrefix
    ? `/api/academy/playback/manifest?${qs}`
    : `/api/academy/playback/stream?${qs}`;

  return {
    ok: true,
    sessionId: session.id,
    playbackToken,
    expiresAt,
    manifestUrl,
  };
}

export async function resolvePlaybackSessionByToken(params: {
  organizationId: string;
  sessionId: string;
  playbackToken: string;
}) {
  const tokenHash = hashSessionToken(params.playbackToken);
  const session = await prisma.academyPlaybackSession.findFirst({
    where: {
      id: params.sessionId,
      organizationId: params.organizationId,
      sessionTokenHash: tokenHash,
      revokedAt: null,
      endedAt: null,
    },
    include: {
      lesson: {
        select: {
          id: true,
          videoAssetId: true,
          videoAsset: {
            select: {
              storageKey: true,
              hlsStoragePrefix: true,
              status: true,
            },
          },
        },
      },
    },
  });

  if (!session) return null;

  const ttlMs = academyPlaybackTokenTtlSeconds() * 1000;
  if (session.startedAt.getTime() + ttlMs < Date.now()) {
    return null;
  }

  await prisma.academyPlaybackSession.update({
    where: { id: session.id },
    data: { lastHeartbeatAt: new Date() },
  });

  return session;
}

export async function revokePlaybackSession(params: {
  organizationId: string;
  sessionId: string;
  userId?: string;
}) {
  await prisma.academyPlaybackSession.updateMany({
    where: {
      id: params.sessionId,
      organizationId: params.organizationId,
      ...(params.userId ? { userId: params.userId } : {}),
      revokedAt: null,
    },
    data: { revokedAt: new Date(), endedAt: new Date() },
  });
}
