import { DomainEventType } from "@/generated/prisma/enums";
import { linkBookingToLead } from "@/lib/crm/booking-to-lead";
import { processFormSubmissionCrm } from "@/lib/crm/form-to-lead";
import { prisma } from "@/lib/prisma";

/** Always-on infrastructure — not toggleable marketing rules. */
export async function runAutomationBuiltins(event: {
  organizationId: string;
  eventType: DomainEventType;
  aggregateType: string;
  aggregateId: string;
}): Promise<void> {
  if (event.eventType.toString().startsWith("BOOKING_")) {
    await linkBookingToLead({
      organizationId: event.organizationId,
      reservationId: event.aggregateId,
      eventType: event.eventType,
    });
  }
  if (event.eventType === DomainEventType.FORM_SUBMISSION_RECEIVED) {
    const sub = await prisma.formSubmission.findFirst({
      where: {
        id: event.aggregateId,
        organizationId: event.organizationId,
      },
      select: { id: true, formId: true, formVersionId: true, branchId: true },
    });
    if (sub) {
      await processFormSubmissionCrm({
        organizationId: event.organizationId,
        submissionId: sub.id,
        formId: sub.formId,
        formVersionId: sub.formVersionId,
        branchId: sub.branchId,
      });
    }
  }
}
