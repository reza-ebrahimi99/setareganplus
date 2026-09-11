/**
 * Canonical counselor profile — BookingAdvisor + User.
 * Login identity stays on User (existing OTP). Capacity/title/specialty/photo
 * live on BookingAdvisor so we do not invent a parallel counselor product.
 */

import {
  AuditAction,
  MembershipStatus,
  SystemRole,
  UserStatus,
} from "@/generated/prisma/enums";
import { publicUrlForStorageKey, writeMediaFile } from "@/lib/media/storage";
import { prisma } from "@/lib/prisma";
import { normalizeIranianMobile } from "@/lib/forms/normalize-mobile";
import { formatJalaliDateTimeShort } from "@/lib/datetime/jalali";
import { isPortalOnlyRole } from "@/lib/auth/constants";
import { createHash, randomBytes } from "node:crypto";
import type { CounselorContext } from "@/lib/counselor-os/auth";
import { formatTomanFromRials } from "@/lib/counselor-os/labels";
import {
  emptyCounselorRevenue,
  loadCounselorPackageRevenueByCounselor,
  type CounselorRevenueTotals,
} from "@/lib/counselor-os/revenue";

export type CounselorCapacityView = {
  capacity: number | null;
  activeAssigned: number;
  remaining: number | null;
  remainingLabel: string;
  ratioLabel: string;
  isFull: boolean;
  unlimited: boolean;
};

export type CounselorDirectoryRow = {
  counselorId: string;
  userId: string;
  membershipId: string;
  name: string;
  mobile: string | null;
  title: string | null;
  specialty: string | null;
  photoUrl: string | null;
  isActive: boolean;
  statusLabel: string;
  capacity: CounselorCapacityView;
  totalAssigned: number;
  revenue: CounselorRevenueTotals;
};

function displayName(first: string, last: string): string {
  return `${first} ${last}`.trim();
}

function photoUrlFromAsset(asset: { storageKey: string } | null | undefined): string | null {
  if (!asset?.storageKey) return null;
  try {
    return publicUrlForStorageKey(asset.storageKey);
  } catch {
    return null;
  }
}

export function describeCapacity(params: {
  capacity: number | null | undefined;
  activeAssigned: number;
}): CounselorCapacityView {
  const activeAssigned = Math.max(0, params.activeAssigned);
  if (params.capacity == null) {
    return {
      capacity: null,
      activeAssigned,
      remaining: null,
      remainingLabel: "نامحدود",
      ratioLabel: `${activeAssigned} / ∞`,
      isFull: false,
      unlimited: true,
    };
  }
  const capacity = Math.max(0, params.capacity);
  const remaining = Math.max(0, capacity - activeAssigned);
  return {
    capacity,
    activeAssigned,
    remaining,
    remainingLabel: String(remaining),
    ratioLabel: `${activeAssigned} / ${capacity}`,
    isFull: remaining <= 0,
    unlimited: false,
  };
}

export function assertCanAssignToCapacity(params: {
  capacity: number | null | undefined;
  activeAssigned: number;
  override: boolean;
  isSupervisor: boolean;
}): void {
  const view = describeCapacity(params);
  if (!view.isFull) return;
  if (params.override && params.isSupervisor) return;
  if (view.unlimited) return;
  if (view.capacity === 0) {
    throw new Error("ظرفیت این مشاور صفر است. تخصیص جدید فقط با تأیید مدیر ممکن است.");
  }
  throw new Error(
    `ظرفیت مشاور تکمیل است (${view.ratioLabel}). تخصیص جدید فقط با تأیید صریح مدیر ممکن است.`,
  );
}

export async function countActiveAssignments(params: {
  organizationId: string;
  counselorUserId: string;
}): Promise<number> {
  return prisma.counselorStudentAssignment.count({
    where: {
      organizationId: params.organizationId,
      counselorUserId: params.counselorUserId,
      status: "ACTIVE",
    },
  });
}

export async function ensureCounselorProfile(params: {
  organizationId: string;
  userId: string;
  displayName: string;
  title?: string | null;
  specialty?: string | null;
  bio?: string | null;
  capacity?: number | null;
  isActive?: boolean;
}) {
  const existing = await prisma.bookingAdvisor.findFirst({
    where: {
      organizationId: params.organizationId,
      userId: params.userId,
      deletedAt: null,
    },
    select: { id: true },
  });
  if (existing) {
    return prisma.bookingAdvisor.update({
      where: { id: existing.id },
      data: {
        displayName: params.displayName,
        title: params.title ?? undefined,
        specialty: params.specialty ?? undefined,
        description: params.bio ?? undefined,
        capacity: params.capacity === undefined ? undefined : params.capacity,
        isActive: params.isActive ?? undefined,
      },
    });
  }
  return prisma.bookingAdvisor.create({
    data: {
      organizationId: params.organizationId,
      userId: params.userId,
      displayName: params.displayName,
      title: params.title ?? null,
      specialty: params.specialty ?? null,
      description: params.bio ?? null,
      capacity: params.capacity ?? null,
      isActive: params.isActive ?? true,
    },
  });
}

export async function listCounselorDirectory(
  ctx: CounselorContext,
): Promise<CounselorDirectoryRow[]> {
  if (!ctx.isSupervisor) {
    throw new Error("فقط مدیر / ناظر فهرست مشاوران را می‌بیند.");
  }

  const memberships = await prisma.organizationMembership.findMany({
    where: {
      organizationId: ctx.organizationId,
      deletedAt: null,
      role: SystemRole.ADVISOR,
    },
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          mobile: true,
          status: true,
          deletedAt: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  const userIds = memberships.map((m) => m.userId);
  const [advisors, activeCounts, totalCounts, revenueMap] = await Promise.all([
    prisma.bookingAdvisor.findMany({
      where: {
        organizationId: ctx.organizationId,
        userId: { in: userIds },
        deletedAt: null,
      },
      select: {
        userId: true,
        title: true,
        specialty: true,
        capacity: true,
        isActive: true,
        photoMedia: { select: { storageKey: true } },
      },
    }),
    prisma.counselorStudentAssignment.groupBy({
      by: ["counselorUserId"],
      where: {
        organizationId: ctx.organizationId,
        counselorUserId: { in: userIds },
        status: "ACTIVE",
      },
      _count: { _all: true },
    }),
    prisma.counselorStudentAssignment.groupBy({
      by: ["counselorUserId"],
      where: {
        organizationId: ctx.organizationId,
        counselorUserId: { in: userIds },
      },
      _count: { _all: true },
    }),
    loadCounselorPackageRevenueByCounselor({
      organizationId: ctx.organizationId,
      counselorUserIds: userIds,
    }),
  ]);

  const advisorByUser = new Map(advisors.map((a) => [a.userId ?? "", a]));
  const activeByUser = new Map(activeCounts.map((r) => [r.counselorUserId, r._count._all]));
  const totalByUser = new Map(totalCounts.map((r) => [r.counselorUserId, r._count._all]));

  return memberships
    .filter((m) => !m.user.deletedAt)
    .map((m) => {
      const advisor = advisorByUser.get(m.userId);
      const activeAssigned = activeByUser.get(m.userId) ?? 0;
      const membershipActive = m.status === MembershipStatus.ACTIVE;
      const advisorActive = advisor?.isActive ?? membershipActive;
      const isActive = membershipActive && advisorActive && m.user.status === UserStatus.ACTIVE;
      return {
        counselorId: m.userId,
        userId: m.userId,
        membershipId: m.id,
        name: displayName(m.user.firstName, m.user.lastName),
        mobile: m.user.mobile,
        title: advisor?.title ?? null,
        specialty: advisor?.specialty ?? null,
        photoUrl: photoUrlFromAsset(advisor?.photoMedia),
        isActive,
        statusLabel: isActive ? "فعال" : "غیرفعال",
        capacity: describeCapacity({
          capacity: advisor?.capacity ?? null,
          activeAssigned,
        }),
        totalAssigned: totalByUser.get(m.userId) ?? 0,
        revenue: revenueMap.get(m.userId) ?? emptyCounselorRevenue(),
      };
    });
}

export async function loadCounselorProfileDetail(
  ctx: CounselorContext,
  counselorUserId: string,
) {
  if (!ctx.isSupervisor && ctx.userId !== counselorUserId) {
    throw new Error("دسترسی به پرونده این مشاور مجاز نیست.");
  }

  const membership = await prisma.organizationMembership.findFirst({
    where: {
      organizationId: ctx.organizationId,
      userId: counselorUserId,
      deletedAt: null,
      role: SystemRole.ADVISOR,
    },
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          mobile: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
      },
    },
  });
  if (!membership) throw new Error("مشاور یافت نشد.");

  const advisor = await prisma.bookingAdvisor.findFirst({
    where: {
      organizationId: ctx.organizationId,
      userId: counselorUserId,
      deletedAt: null,
    },
    include: {
      photoMedia: { select: { storageKey: true } },
    },
  });

  const [activeAssigned, totalAssigned, revenue] = await Promise.all([
    countActiveAssignments({
      organizationId: ctx.organizationId,
      counselorUserId,
    }),
    prisma.counselorStudentAssignment.count({
      where: { organizationId: ctx.organizationId, counselorUserId },
    }),
    loadCounselorPackageRevenueByCounselor({
      organizationId: ctx.organizationId,
      counselorUserIds: [counselorUserId],
    }),
  ]);

  const isActive =
    membership.status === MembershipStatus.ACTIVE &&
    membership.user.status === UserStatus.ACTIVE &&
    (advisor?.isActive ?? true);

  return {
    counselorId: counselorUserId,
    userId: counselorUserId,
    membershipId: membership.id,
    name: displayName(membership.user.firstName, membership.user.lastName),
    firstName: membership.user.firstName,
    lastName: membership.user.lastName,
    mobile: membership.user.mobile,
    title: advisor?.title ?? null,
    specialty: advisor?.specialty ?? null,
    bio: advisor?.description ?? null,
    photoUrl: photoUrlFromAsset(advisor?.photoMedia),
    isActive,
    statusLabel: isActive ? "فعال" : "غیرفعال",
    capacity: describeCapacity({
      capacity: advisor?.capacity ?? null,
      activeAssigned,
    }),
    totalAssigned,
    revenue: revenue.get(counselorUserId) ?? emptyCounselorRevenue(),
    createdAt: membership.user.createdAt,
    updatedAt: membership.user.updatedAt,
    advisorId: advisor?.id ?? null,
  };
}

export async function createCounselorProfile(params: {
  ctx: CounselorContext;
  firstName: string;
  lastName: string;
  mobile: string;
  title?: string;
  specialty?: string;
  bio?: string;
  capacity?: number | null;
}) {
  if (!params.ctx.isSupervisor) {
    throw new Error("فقط مدیر / ناظر می‌تواند مشاور بسازد.");
  }
  const mobile = normalizeIranianMobile(params.mobile);
  if (!mobile.ok) throw new Error("شماره موبایل معتبر نیست.");
  const firstName = params.firstName.trim();
  const lastName = params.lastName.trim();
  if (!firstName || !lastName) throw new Error("نام و نام خانوادگی الزامی است.");

  const existing = await prisma.user.findFirst({
    where: { normalizedMobile: mobile.normalized },
    include: {
      memberships: {
        where: { organizationId: params.ctx.organizationId, deletedAt: null },
        select: { id: true, role: true },
      },
    },
  });
  if (existing?.memberships[0] && isPortalOnlyRole(existing.memberships[0].role)) {
    throw new Error("این شماره متعلق به حساب دانش‌آموز/والد است و قابل تبدیل به مشاور نیست.");
  }

  const user = existing
    ? await prisma.user.update({
        where: { id: existing.id },
        data: {
          firstName,
          lastName,
          mobile: mobile.normalized,
          normalizedMobile: mobile.normalized,
          status: UserStatus.ACTIVE,
          deletedAt: null,
        },
      })
    : await prisma.user.create({
        data: {
          firstName,
          lastName,
          mobile: mobile.normalized,
          normalizedMobile: mobile.normalized,
          status: UserStatus.ACTIVE,
        },
      });

  const membership = await prisma.organizationMembership.upsert({
    where: {
      organizationId_userId: {
        organizationId: params.ctx.organizationId,
        userId: user.id,
      },
    },
    update: {
      role: SystemRole.ADVISOR,
      status: MembershipStatus.ACTIVE,
      deletedAt: null,
    },
    create: {
      organizationId: params.ctx.organizationId,
      userId: user.id,
      role: SystemRole.ADVISOR,
      status: MembershipStatus.ACTIVE,
    },
  });

  await ensureCounselorProfile({
    organizationId: params.ctx.organizationId,
    userId: user.id,
    displayName: displayName(firstName, lastName),
    title: params.title ?? null,
    specialty: params.specialty ?? null,
    bio: params.bio ?? null,
    capacity: params.capacity ?? null,
    isActive: true,
  });

  await prisma.auditLog.create({
    data: {
      organizationId: params.ctx.organizationId,
      actorUserId: params.ctx.userId,
      action: AuditAction.STAFF_CREATED,
      entityType: "CounselorProfile",
      entityId: user.id,
      metadata: { membershipId: membership.id, capacity: params.capacity ?? null },
    },
  });

  return user.id;
}

export async function updateCounselorProfile(params: {
  ctx: CounselorContext;
  counselorUserId: string;
  firstName?: string;
  lastName?: string;
  mobile?: string;
  title?: string | null;
  specialty?: string | null;
  bio?: string | null;
  capacity?: number | null;
  isActive?: boolean;
}) {
  const own = params.ctx.userId === params.counselorUserId;
  if (!params.ctx.isSupervisor && !own) {
    throw new Error("ویرایش این پروفایل مجاز نیست.");
  }
  if (!params.ctx.isSupervisor && (params.capacity !== undefined || params.isActive !== undefined)) {
    throw new Error("مشاور نمی‌تواند ظرفیت یا وضعیت فعال‌سازی را تغییر دهد.");
  }

  const membership = await prisma.organizationMembership.findFirst({
    where: {
      organizationId: params.ctx.organizationId,
      userId: params.counselorUserId,
      deletedAt: null,
    },
    include: { user: true },
  });
  if (!membership) throw new Error("مشاور یافت نشد.");

  const firstName = (params.firstName ?? membership.user.firstName).trim();
  const lastName = (params.lastName ?? membership.user.lastName).trim();
  let mobile = membership.user.mobile;
  if (params.mobile != null && params.ctx.isSupervisor) {
    const parsed = normalizeIranianMobile(params.mobile);
    if (!parsed.ok) throw new Error("شماره موبایل معتبر نیست.");
    mobile = parsed.normalized;
  }

  await prisma.user.update({
    where: { id: params.counselorUserId },
    data: {
      firstName,
      lastName,
      ...(mobile
        ? { mobile, normalizedMobile: mobile }
        : {}),
    },
  });

  if (params.isActive !== undefined && params.ctx.isSupervisor) {
    await prisma.organizationMembership.update({
      where: { id: membership.id },
      data: {
        status: params.isActive ? MembershipStatus.ACTIVE : MembershipStatus.SUSPENDED,
      },
    });
    if (!params.isActive) {
      await prisma.adminSession.updateMany({
        where: {
          revokedAt: null,
          OR: [
            { organizationMembershipId: membership.id },
            { organizationMembershipId: null, userId: params.counselorUserId },
          ],
        },
        data: { revokedAt: new Date() },
      });
    }
  }

  await ensureCounselorProfile({
    organizationId: params.ctx.organizationId,
    userId: params.counselorUserId,
    displayName: displayName(firstName, lastName),
    title: params.title,
    specialty: params.specialty,
    bio: params.bio,
    capacity: params.capacity,
    isActive: params.isActive,
  });

  await prisma.auditLog.create({
    data: {
      organizationId: params.ctx.organizationId,
      actorUserId: params.ctx.userId,
      action:
        params.isActive === false ? AuditAction.STAFF_DEACTIVATED : AuditAction.STAFF_UPDATED,
      entityType: "CounselorProfile",
      entityId: params.counselorUserId,
      metadata: {
        capacity: params.capacity ?? undefined,
        isActive: params.isActive ?? undefined,
      },
    },
  });
}

export async function saveCounselorPortrait(params: {
  ctx: CounselorContext;
  counselorUserId: string;
  file: File;
}) {
  if (!params.ctx.isSupervisor && params.ctx.userId !== params.counselorUserId) {
    throw new Error("بارگذاری تصویر این مشاور مجاز نیست.");
  }
  const type = params.file.type;
  if (!["image/jpeg", "image/png", "image/webp"].includes(type)) {
    throw new Error("فقط تصویر JPG، PNG یا WEBP پذیرفته می‌شود.");
  }
  if (params.file.size > 2_000_000) {
    throw new Error("حجم تصویر نباید بیشتر از ۲ مگابایت باشد.");
  }

  const ext = type === "image/png" ? "png" : type === "image/webp" ? "webp" : "jpg";
  const storageKey = `counselor/${randomBytes(16).toString("hex")}.${ext}`;
  const buffer = Buffer.from(await params.file.arrayBuffer());
  const written = await writeMediaFile({ storageKey, data: buffer });

  const media = await prisma.mediaAsset.create({
    data: {
      organizationId: params.ctx.organizationId,
      storageKey,
      originalName: params.file.name.slice(0, 180) || `counselor.${ext}`,
      mimeType: type,
      byteSize: written.byteSize,
      checksum: written.checksum || createHash("sha256").update(buffer).digest("hex"),
      category: "counselor-portrait",
      createdByUserId: params.ctx.userId,
    },
  });

  const advisor = await prisma.bookingAdvisor.findFirst({
    where: {
      organizationId: params.ctx.organizationId,
      userId: params.counselorUserId,
      deletedAt: null,
    },
    select: { id: true },
  });
  if (!advisor) {
    const user = await prisma.user.findFirst({
      where: { id: params.counselorUserId },
      select: { firstName: true, lastName: true },
    });
    await prisma.bookingAdvisor.create({
      data: {
        organizationId: params.ctx.organizationId,
        userId: params.counselorUserId,
        displayName: displayName(user?.firstName ?? "", user?.lastName ?? ""),
        photoMediaId: media.id,
        isActive: true,
      },
    });
  } else {
    await prisma.bookingAdvisor.update({
      where: { id: advisor.id },
      data: { photoMediaId: media.id },
    });
  }
}

export function formatCapacityHeadline(view: CounselorCapacityView): string {
  if (view.unlimited) {
    return `${view.activeAssigned} پرونده فعال · ظرفیت نامحدود`;
  }
  return `${view.ratioLabel} · آزاد: ${view.remainingLabel}`;
}

export function formatRevenueHeadline(revenue: CounselorRevenueTotals): {
  month: string;
  total: string;
} {
  return {
    month: revenue.monthTomanLabel,
    total: revenue.totalTomanLabel,
  };
}

export async function loadCounselorOpsSummary(params: {
  organizationId: string;
  counselorUserId: string;
}) {
  const now = new Date();
  const [upcoming, overdueFollowUps, recentSessions, activeStudents] = await Promise.all([
    prisma.counselorAppointment.findMany({
      where: {
        organizationId: params.organizationId,
        counselorUserId: params.counselorUserId,
        status: { in: ["BOOKED", "CONFIRMED"] },
        bookingReservation: { slot: { startsAt: { gte: now } } },
      },
      include: {
        student: { select: { id: true, fullName: true } },
        bookingReservation: { include: { slot: true } },
      },
      orderBy: { bookingReservation: { slot: { startsAt: "asc" } } },
      take: 12,
    }),
    prisma.counselorFollowUp.findMany({
      where: {
        organizationId: params.organizationId,
        counselorUserId: params.counselorUserId,
        status: "PENDING",
        dueAt: { lt: now },
      },
      include: { student: { select: { id: true, fullName: true } } },
      orderBy: { dueAt: "asc" },
      take: 12,
    }),
    prisma.counselingSessionRecord.findMany({
      where: {
        organizationId: params.organizationId,
        counselorUserId: params.counselorUserId,
      },
      include: { student: { select: { id: true, fullName: true } } },
      orderBy: { updatedAt: "desc" },
      take: 10,
    }),
    prisma.counselorStudentAssignment.findMany({
      where: {
        organizationId: params.organizationId,
        counselorUserId: params.counselorUserId,
        status: "ACTIVE",
      },
      include: { student: { select: { id: true, fullName: true } } },
      orderBy: { assignedAt: "desc" },
      take: 80,
    }),
  ]);

  return {
    upcoming: upcoming.map((row) => ({
      id: row.id,
      studentId: row.student.id,
      studentName: row.student.fullName,
      whenLabel: formatJalaliDateTimeShort(row.bookingReservation.slot.startsAt),
    })),
    overdueFollowUps: overdueFollowUps.map((row) => ({
      id: row.id,
      studentId: row.student.id,
      studentName: row.student.fullName,
      title: row.title,
    })),
    recentSessions: recentSessions.map((row) => ({
      id: row.id,
      studentId: row.student.id,
      studentName: row.student.fullName,
      subject: row.subject,
    })),
    activeStudents: activeStudents.map((row) => ({
      studentId: row.student.id,
      studentName: row.student.fullName,
      assignedAt: row.assignedAt,
    })),
  };
}
