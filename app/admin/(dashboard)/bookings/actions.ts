"use server";

import { revalidatePath } from "next/cache";
import {
  BookingCheckInMethod,
  BookingStatus,
} from "@/generated/prisma/enums";
import { checkInReservation } from "@/lib/booking/check-in";
import { generateSlotsForRange } from "@/lib/booking/generate-slots";
import {
  cancelReservation,
  promoteFromWaitingList,
  updateReservationStatus,
} from "@/lib/booking/manage-reservation";
import { getAdminSession } from "@/lib/auth/require-admin";
import { parseJalaliDateInput } from "@/lib/datetime/jalali";
import { prisma } from "@/lib/prisma";

export type BookingActionState = { error?: string; success?: string };

const read = (data: FormData, key: string) =>
  typeof data.get(key) === "string" ? String(data.get(key)).trim() : "";
const checked = (data: FormData, key: string) => data.get(key) === "on";
const number = (data: FormData, key: string, fallback = 0) => {
  const value = Number(read(data, key));
  return Number.isInteger(value) ? value : fallback;
};

async function sessionOrError(): Promise<
  { organizationId: string; userId: string } | BookingActionState
> {
  const session = await getAdminSession();
  return session
    ? { organizationId: session.organization.id, userId: session.user.id }
    : { error: "نشست مدیریت معتبر نیست. دوباره وارد شوید." };
}

function isContext(
  value: Awaited<ReturnType<typeof sessionOrError>>,
): value is { organizationId: string; userId: string } {
  return "organizationId" in value;
}

function normalizeSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function createBookingServiceAction(
  _prev: BookingActionState,
  formData: FormData,
): Promise<BookingActionState> {
  const context = await sessionOrError();
  if (!isContext(context)) return context;
  const title = read(formData, "title");
  const slug = normalizeSlug(read(formData, "slug"));
  const durationMinutes = number(formData, "durationMinutes");
  if (!title || !slug || durationMinutes < 5) {
    return { error: "عنوان، نامک انگلیسی و مدت معتبر الزامی است." };
  }
  try {
    await prisma.bookingService.create({
      data: {
        organizationId: context.organizationId,
        title,
        slug,
        description: read(formData, "description") || null,
        durationMinutes,
        bufferBeforeMinutes: Math.max(0, number(formData, "bufferBeforeMinutes")),
        bufferAfterMinutes: Math.max(0, number(formData, "bufferAfterMinutes")),
        minimumLeadTimeMinutes: Math.max(0, number(formData, "minimumLeadTimeMinutes", 60)),
        maximumAdvanceDays: Math.max(1, number(formData, "maximumAdvanceDays", 30)),
        meetingTypes: ["IN_PERSON"],
      },
    });
  } catch {
    return { error: "ذخیره خدمت انجام نشد؛ نامک باید یکتا باشد." };
  }
  revalidatePath("/admin/bookings/services");
  return { success: "خدمت نوبت‌دهی ایجاد شد." };
}

export async function updateBookingServiceAction(
  _prev: BookingActionState,
  formData: FormData,
): Promise<BookingActionState> {
  const context = await sessionOrError();
  if (!isContext(context)) return context;
  const id = read(formData, "serviceId");
  const title = read(formData, "title");
  if (!id || !title || number(formData, "durationMinutes") < 5) {
    return { error: "اطلاعات خدمت معتبر نیست." };
  }
  const updated = await prisma.bookingService.updateMany({
    where: { id, organizationId: context.organizationId, deletedAt: null },
    data: {
      title,
      description: read(formData, "description") || null,
      durationMinutes: number(formData, "durationMinutes"),
      bufferBeforeMinutes: Math.max(0, number(formData, "bufferBeforeMinutes")),
      bufferAfterMinutes: Math.max(0, number(formData, "bufferAfterMinutes")),
      minimumLeadTimeMinutes: Math.max(0, number(formData, "minimumLeadTimeMinutes", 60)),
      maximumAdvanceDays: Math.max(1, number(formData, "maximumAdvanceDays", 30)),
      isActive: checked(formData, "isActive"),
    },
  });
  if (!updated.count) return { error: "خدمت مورد نظر یافت نشد." };
  revalidatePath(`/admin/bookings/services/${id}`);
  revalidatePath("/admin/bookings/services");
  return { success: "تنظیمات خدمت ذخیره شد." };
}

export async function createAdvisorAction(
  _prev: BookingActionState,
  formData: FormData,
): Promise<BookingActionState> {
  const context = await sessionOrError();
  if (!isContext(context)) return context;
  const serviceId = read(formData, "serviceId");
  const displayName = read(formData, "displayName");
  if (!serviceId || !displayName) return { error: "نام مشاور الزامی است." };
  const service = await prisma.bookingService.findFirst({
    where: { id: serviceId, organizationId: context.organizationId, deletedAt: null },
    select: { id: true },
  });
  if (!service) return { error: "خدمت مورد نظر یافت نشد." };
  await prisma.$transaction(async (tx) => {
    const advisor = await tx.bookingAdvisor.create({
      data: {
        organizationId: context.organizationId,
        displayName,
        description: read(formData, "description") || null,
      },
    });
    await tx.bookingAdvisorService.create({
      data: { organizationId: context.organizationId, advisorId: advisor.id, serviceId },
    });
  });
  revalidatePath(`/admin/bookings/services/${serviceId}`);
  return { success: "مشاور و اتصال او به خدمت ثبت شد." };
}

export async function createAvailabilityRuleAction(
  _prev: BookingActionState,
  formData: FormData,
): Promise<BookingActionState> {
  const context = await sessionOrError();
  if (!isContext(context)) return context;
  const serviceId = read(formData, "serviceId");
  const advisorId = read(formData, "advisorId");
  const weekday = number(formData, "weekday", -1);
  const startLocalTime = read(formData, "startLocalTime");
  const endLocalTime = read(formData, "endLocalTime");
  if (!serviceId || !advisorId || weekday < 0 || weekday > 6 || !/^\d{2}:\d{2}$/.test(startLocalTime) || !/^\d{2}:\d{2}$/.test(endLocalTime) || startLocalTime >= endLocalTime) {
    return { error: "روز و بازه ساعت معتبر را وارد کنید." };
  }
  const link = await prisma.bookingAdvisorService.findFirst({
    where: { organizationId: context.organizationId, advisorId, serviceId },
    select: { id: true },
  });
  if (!link) return { error: "مشاور به این خدمت متصل نیست." };
  await prisma.bookingAvailabilityRule.create({
    data: {
      organizationId: context.organizationId, serviceId, advisorId, weekday,
      startLocalTime, endLocalTime,
      slotCapacity: Math.max(1, number(formData, "slotCapacity", 1)),
    },
  });
  revalidatePath(`/admin/bookings/services/${serviceId}`);
  return { success: "قاعده دسترسی ثبت شد." };
}

export async function generateSlotsAction(
  _prev: BookingActionState,
  formData: FormData,
): Promise<BookingActionState> {
  const context = await sessionOrError();
  if (!isContext(context)) return context;
  const serviceId = read(formData, "serviceId");
  const advisorId = read(formData, "advisorId");
  const from = parseJalaliDateInput(read(formData, "from"));
  const to = parseJalaliDateInput(read(formData, "to"));
  if (!serviceId || !advisorId || !from || !to) return { error: "بازه تاریخ جلالی معتبر انتخاب کنید." };
  const result = await generateSlotsForRange({ organizationId: context.organizationId, serviceId, advisorId, from, to });
  revalidatePath(`/admin/bookings/services/${serviceId}`);
  revalidatePath("/admin/bookings/calendar");
  return { success: `${result.created} نوبت ایجاد و ${result.skipped} مورد رد یا به‌روزرسانی شد.` };
}

async function reservationAction(
  formData: FormData,
  handler: (organizationId: string, reservationId: string) => Promise<{ ok: true } | { ok: false; error: string }>,
): Promise<BookingActionState> {
  const context = await sessionOrError();
  if (!isContext(context)) return context;
  const reservationId = read(formData, "reservationId");
  if (!reservationId) return { error: "شناسه رزرو نامعتبر است." };
  const result = await handler(context.organizationId, reservationId);
  if (!result.ok) return { error: result.error };
  revalidatePath(`/admin/bookings/reservations/${reservationId}`);
  revalidatePath("/admin/bookings/calendar");
  return { success: "وضعیت رزرو به‌روزرسانی شد." };
}

export async function confirmReservationAction(_: BookingActionState, formData: FormData) {
  return reservationAction(formData, (organizationId, reservationId) =>
    updateReservationStatus({ organizationId, reservationId, status: BookingStatus.CONFIRMED }));
}
export async function cancelReservationAction(_: BookingActionState, formData: FormData) {
  return reservationAction(formData, (organizationId, reservationId) =>
    cancelReservation({ organizationId, reservationId }));
}
export async function completeReservationAction(_: BookingActionState, formData: FormData) {
  return reservationAction(formData, (organizationId, reservationId) =>
    updateReservationStatus({ organizationId, reservationId, status: BookingStatus.COMPLETED }));
}
export async function noShowReservationAction(_: BookingActionState, formData: FormData) {
  return reservationAction(formData, (organizationId, reservationId) =>
    updateReservationStatus({ organizationId, reservationId, status: BookingStatus.NO_SHOW }));
}
export async function promoteWaitingListAction(_: BookingActionState, formData: FormData) {
  return reservationAction(formData, (organizationId, reservationId) =>
    promoteFromWaitingList({ organizationId, reservationId }));
}
export async function checkInReservationAction(_: BookingActionState, formData: FormData) {
  const context = await sessionOrError();
  if (!isContext(context)) return context;
  const result = await checkInReservation({
    organizationId: context.organizationId, actorUserId: context.userId,
    token: read(formData, "token") || undefined,
    reservationId: read(formData, "reservationId") || undefined,
    method: read(formData, "token")
      ? BookingCheckInMethod.QR
      : BookingCheckInMethod.ADMIN,
  });
  if (!result.ok) return { error: result.error };
  revalidatePath(`/admin/bookings/reservations/${result.reservationId}`);
  return { success: "ورود با موفقیت ثبت شد." };
}
