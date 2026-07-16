/**
 * Link or create lead from booking reservation (idempotent).
 */

import type { Prisma } from "@/generated/prisma/client";
import {
  CrmActivityType,
  DomainEventType,
  LeadSourceType,
  ServiceInterest,
} from "@/generated/prisma/enums";
import { recordCrmActivity } from "@/lib/crm/activity";
import { changeLeadStage, upsertLead } from "@/lib/crm/leads";
import { ensureDefaultPipeline } from "@/lib/crm/pipeline";
import { createCrmTask } from "@/lib/crm/tasks";
import { prisma } from "@/lib/prisma";

export async function linkBookingToLead(params: {
  organizationId: string;
  reservationId: string;
  eventType: DomainEventType;
}): Promise<void> {
  try {
    const reservation = await prisma.bookingReservation.findFirst({
      where: {
        id: params.reservationId,
        organizationId: params.organizationId,
        deletedAt: null,
      },
      select: {
        id: true,
        leadId: true,
        firstName: true,
        lastName: true,
        normalizedMobile: true,
        normalizedEmail: true,
        normalizedNationalId: true,
        formSubmissionId: true,
        trackingCode: true,
        status: true,
        slot: {
          select: {
            branchId: true,
            serviceId: true,
          },
        },
      },
    });
    if (!reservation) return;

    let branchId = reservation.slot.branchId;
    if (!branchId) {
      const branch = await prisma.branch.findFirst({
        where: { organizationId: params.organizationId, deletedAt: null },
        select: { id: true },
        orderBy: { createdAt: "asc" },
      });
      if (!branch) return;
      branchId = branch.id;
    }

    let leadId = reservation.leadId;

    if (!leadId && reservation.formSubmissionId) {
      const submission = await prisma.formSubmission.findFirst({
        where: {
          id: reservation.formSubmissionId,
          organizationId: params.organizationId,
        },
        select: { leadId: true },
      });
      if (submission?.leadId) leadId = submission.leadId;
    }

    if (!leadId) {
      const pipeline = await ensureDefaultPipeline(params.organizationId);
      const moveToConsultation =
        params.eventType === DomainEventType.BOOKING_CONFIRMED ||
        params.eventType === DomainEventType.BOOKING_CREATED;

      const result = await upsertLead({
        organizationId: params.organizationId,
        branchId,
        firstName: reservation.firstName,
        lastName: reservation.lastName,
        mobile: reservation.normalizedMobile,
        email: reservation.normalizedEmail,
        nationalCode: reservation.normalizedNationalId,
        source: "BOOKING",
        sourceType: LeadSourceType.BOOKING,
        sourceBookingReservationId: reservation.id,
        sourceFormSubmissionId: reservation.formSubmissionId,
        stageId: moveToConsultation
          ? pipeline.consultationStageId
          : pipeline.newStageId,
        pipelineId: pipeline.pipelineId,
        serviceInterest: ServiceInterest.CONSULTATION,
        applyScoring: true,
        createInitialTask: false,
      });
      if (!result.ok) return;
      leadId = result.leadId;
    }

    await prisma.bookingReservation.update({
      where: { id: reservation.id },
      data: { leadId },
    });

    const activityType =
      params.eventType === DomainEventType.BOOKING_CANCELLED
        ? CrmActivityType.BOOKING_CANCELLED
        : params.eventType === DomainEventType.BOOKING_RESCHEDULED
          ? CrmActivityType.BOOKING_RESCHEDULED
          : CrmActivityType.BOOKING_CREATED;

    await recordCrmActivity({
      organizationId: params.organizationId,
      leadId,
      activityType,
      title:
        params.eventType === DomainEventType.BOOKING_CANCELLED
          ? "رزرو لغو شد"
          : params.eventType === DomainEventType.BOOKING_RESCHEDULED
            ? "رزرو جابه‌جا شد"
            : "رزرو ثبت شد",
      relatedBookingReservationId: reservation.id,
      metadata: { trackingCode: reservation.trackingCode, status: reservation.status },
    });

    if (
      params.eventType === DomainEventType.BOOKING_CONFIRMED ||
      params.eventType === DomainEventType.BOOKING_CREATED
    ) {
      const pipeline = await ensureDefaultPipeline(params.organizationId);
      await changeLeadStage({
        organizationId: params.organizationId,
        leadId,
        stageId: pipeline.consultationStageId,
      });
      await prisma.lead.update({
        where: { id: leadId },
        data: {
          nextFollowUpAt: new Date(Date.now() + 2 * 60 * 60 * 1000),
          sourceBookingReservationId: reservation.id,
        },
      });
      await createCrmTask({
        organizationId: params.organizationId,
        leadId,
        title: "پیگیری جلسه مشاوره",
        taskType: "CONSULTATION",
        dueMinutes: 120,
        idempotencyKey: `booking_consult_task:${reservation.id}`,
      });
    }

    if (params.eventType === DomainEventType.BOOKING_CANCELLED) {
      await createCrmTask({
        organizationId: params.organizationId,
        leadId,
        title: "پیگیری پس از لغو رزرو",
        taskType: "FOLLOW_UP",
        dueMinutes: 180,
        idempotencyKey: `booking_cancel_task:${reservation.id}`,
      });
    }

    void ({
      organizationId: params.organizationId,
      payload: {
        reservationId: reservation.id,
        leadId,
      } satisfies Prisma.InputJsonObject,
    });
  } catch {
    // Booking path must not fail on CRM errors.
  }
}
