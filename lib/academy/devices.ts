import { prisma } from "@/lib/prisma";

function parseUa(userAgent: string | null | undefined): {
  browserLabel: string | null;
  osLabel: string | null;
  deviceType: string | null;
} {
  const ua = (userAgent ?? "").toLowerCase();
  if (!ua) return { browserLabel: null, osLabel: null, deviceType: null };

  const browserLabel = ua.includes("chrome")
    ? "Chrome"
    : ua.includes("firefox")
      ? "Firefox"
      : ua.includes("safari")
        ? "Safari"
        : "مرورگر";

  const osLabel = ua.includes("android")
    ? "Android"
    : ua.includes("iphone") || ua.includes("ipad")
      ? "iOS"
      : ua.includes("windows")
        ? "Windows"
        : ua.includes("mac")
          ? "macOS"
          : "سیستم‌عامل";

  const deviceType =
    ua.includes("mobile") || ua.includes("android") || ua.includes("iphone")
      ? "mobile"
      : "desktop";

  return { browserLabel, osLabel, deviceType };
}

export async function registerUserDevice(params: {
  organizationId: string;
  userId: string;
  deviceKey: string;
  userAgent?: string | null;
}) {
  const labels = parseUa(params.userAgent);
  const now = new Date();

  await prisma.academyUserDevice.upsert({
    where: {
      organizationId_userId_deviceKey: {
        organizationId: params.organizationId,
        userId: params.userId,
        deviceKey: params.deviceKey,
      },
    },
    create: {
      organizationId: params.organizationId,
      userId: params.userId,
      deviceKey: params.deviceKey,
      ...labels,
      firstSeenAt: now,
      lastSeenAt: now,
    },
    update: {
      lastSeenAt: now,
      revokedAt: null,
      ...labels,
    },
  });
}

export async function assertDeviceLimits(params: {
  organizationId: string;
  userId: string;
  deviceKey: string;
  maxDevices: number;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const existing = await prisma.academyUserDevice.findUnique({
    where: {
      organizationId_userId_deviceKey: {
        organizationId: params.organizationId,
        userId: params.userId,
        deviceKey: params.deviceKey,
      },
    },
    select: { revokedAt: true },
  });

  if (existing && !existing.revokedAt) {
    return { ok: true };
  }

  const activeCount = await prisma.academyUserDevice.count({
    where: {
      organizationId: params.organizationId,
      userId: params.userId,
      revokedAt: null,
    },
  });

  if (activeCount >= params.maxDevices) {
    return {
      ok: false,
      error: `حداکثر ${params.maxDevices} دستگاه فعال مجاز است. یکی از دستگاه‌ها را لغو کنید.`,
    };
  }

  return { ok: true };
}

export async function listUserDevices(params: {
  organizationId: string;
  userId: string;
}) {
  return prisma.academyUserDevice.findMany({
    where: {
      organizationId: params.organizationId,
      userId: params.userId,
    },
    orderBy: { lastSeenAt: "desc" },
  });
}

export async function revokeUserDevice(params: {
  organizationId: string;
  userId: string;
  deviceId: string;
}) {
  await prisma.academyUserDevice.updateMany({
    where: {
      id: params.deviceId,
      organizationId: params.organizationId,
      userId: params.userId,
    },
    data: { revokedAt: new Date() },
  });
}
