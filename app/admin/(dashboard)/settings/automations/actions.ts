"use server";

import { revalidatePath } from "next/cache";
import { DomainEventType } from "@/generated/prisma/enums";
import { getAdminSession } from "@/lib/auth/require-admin";
import {
  AUTOMATION_PRESETS,
  isKnownDomainEventType,
  parseAutomationActionConfig,
  parseAutomationConditions,
  validateAutomationActionConfig,
} from "@/lib/crm/automation-contract";
import { prisma } from "@/lib/prisma";

export async function toggleAutomationRuleAction(formData: FormData) {
  const session = await getAdminSession();
  if (!session) return;
  const id = String(formData.get("ruleId") ?? "");
  const enabled = String(formData.get("enabled") ?? "") === "1";
  if (!id) return;

  await prisma.automationRule.updateMany({
    where: {
      id,
      organizationId: session.organization.id,
      deletedAt: null,
    },
    data: { isEnabled: enabled },
  });

  revalidatePath("/admin/settings/automations");
}

export async function createAutomationFromPresetAction(formData: FormData) {
  const session = await getAdminSession();
  if (!session) return;
  const code = String(formData.get("presetCode") ?? "");
  const preset = AUTOMATION_PRESETS.find((p) => p.code === code);
  if (!preset) return;

  await prisma.automationRule.create({
    data: {
      organizationId: session.organization.id,
      name: preset.name,
      trigger: preset.trigger,
      isEnabled: false,
      conditions: preset.conditions,
      actionConfig: preset.actionConfig,
    },
  });

  revalidatePath("/admin/settings/automations");
}

export async function createAutomationRuleAction(formData: FormData) {
  const session = await getAdminSession();
  if (!session) return;

  const name = String(formData.get("name") ?? "").trim();
  const triggerRaw = String(formData.get("trigger") ?? "").trim();
  const formId = String(formData.get("formId") ?? "").trim() || null;
  const bookingServiceId =
    String(formData.get("bookingServiceId") ?? "").trim() || null;
  const actionsJson = String(formData.get("actionsJson") ?? "{}");
  const conditionsJson = String(formData.get("conditionsJson") ?? "{}");

  if (!name || !isKnownDomainEventType(triggerRaw)) return;

  let actionsRaw: unknown = {};
  let conditionsRaw: unknown = {};
  try {
    actionsRaw = JSON.parse(actionsJson);
    conditionsRaw = JSON.parse(conditionsJson);
  } catch {
    return;
  }

  const validationError = validateAutomationActionConfig(actionsRaw);
  if (validationError) return;

  const actionConfig = parseAutomationActionConfig(actionsRaw);
  const conditions = parseAutomationConditions(conditionsRaw);

  if (formId) {
    const form = await prisma.form.findFirst({
      where: {
        id: formId,
        organizationId: session.organization.id,
        deletedAt: null,
      },
      select: { id: true },
    });
    if (!form) return;
  }
  if (bookingServiceId) {
    const service = await prisma.bookingService.findFirst({
      where: {
        id: bookingServiceId,
        organizationId: session.organization.id,
        deletedAt: null,
      },
      select: { id: true },
    });
    if (!service) return;
  }

  await prisma.automationRule.create({
    data: {
      organizationId: session.organization.id,
      name,
      trigger: triggerRaw as DomainEventType,
      formId,
      bookingServiceId,
      isEnabled: false,
      conditions,
      actionConfig,
    },
  });

  revalidatePath("/admin/settings/automations");
}
