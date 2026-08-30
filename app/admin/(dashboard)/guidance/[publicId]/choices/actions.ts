"use server";

/**
 * Guidance Journey Engine Step 10 — counselor import/edit/approve actions.
 */

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/require-admin";
import { isGuidanceEnabled } from "@/lib/guidance/feature-flags";
import {
  approveGuidanceMajorChoices,
  importGuidanceMajorChoices,
  updateGuidanceMajorChoiceRow,
} from "@/lib/guidance/journey/steps/step10-ai-arrangement";
import { prisma } from "@/lib/prisma";

export type Step10AdminActionResult = { ok: true } | { ok: false; error: string };

async function requireChoicesGate(publicId: string) {
  const session = await requirePermission("guidance.review");
  const enabled = await isGuidanceEnabled(session.organization.id);
  if (!enabled) {
    return { ok: false as const, error: "سامانه انتخاب رشته فعال نیست." };
  }
  const plan = await prisma.guidancePlan.findFirst({
    where: { organizationId: session.organization.id, publicId, deletedAt: null },
    select: { id: true, publicId: true },
  });
  if (!plan) {
    return { ok: false as const, error: "پرونده یافت نشد." };
  }
  return { ok: true as const, session, plan };
}

function revalidate(publicId: string) {
  revalidatePath(`/admin/guidance/${publicId}/choices`);
}

export async function importGuidanceChoicesAction(input: {
  publicId: string;
  rawJson: string;
}): Promise<Step10AdminActionResult> {
  const gate = await requireChoicesGate(input.publicId);
  if (!gate.ok) return gate;

  const result = await importGuidanceMajorChoices({
    organizationId: gate.session.organization.id,
    actorUserId: gate.session.user.id,
    planId: gate.plan.id,
    planPublicId: gate.plan.publicId,
    rawJson: input.rawJson,
  });

  if (!result.ok) return result;
  revalidate(input.publicId);
  return { ok: true };
}

export async function updateGuidanceChoiceRowAction(input: {
  publicId: string;
  choiceId: string;
  university: string;
  major: string;
  city: string;
  educationType: string;
  rank: number;
  notes: string;
}): Promise<Step10AdminActionResult> {
  const gate = await requireChoicesGate(input.publicId);
  if (!gate.ok) return gate;

  const result = await updateGuidanceMajorChoiceRow({
    organizationId: gate.session.organization.id,
    actorUserId: gate.session.user.id,
    planId: gate.plan.id,
    planPublicId: gate.plan.publicId,
    choiceId: input.choiceId,
    patch: {
      university: input.university,
      major: input.major,
      city: input.city,
      educationType: input.educationType,
      rank: input.rank,
      notes: input.notes,
    },
  });

  if (!result.ok) return result;
  revalidate(input.publicId);
  return { ok: true };
}

export async function approveGuidanceChoicesAction(
  publicId: string,
): Promise<Step10AdminActionResult> {
  const gate = await requireChoicesGate(publicId);
  if (!gate.ok) return gate;

  const result = await approveGuidanceMajorChoices({
    organizationId: gate.session.organization.id,
    actorUserId: gate.session.user.id,
    planId: gate.plan.id,
    planPublicId: gate.plan.publicId,
  });

  if (!result.ok) return result;
  revalidate(publicId);
  return { ok: true };
}
