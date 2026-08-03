/**
 * Commerce paid-order admin SMS recipient settings (org-scoped).
 */

import { randomBytes } from "node:crypto";
import type { Prisma } from "@/generated/prisma/client";
import { normalizeIranianMobile } from "@/lib/forms/normalize-mobile";
import { prisma } from "@/lib/prisma";

export type CommerceSmsRecipient = {
  id: string;
  mobile: string;
  enabled: boolean;
};

export type CommerceNotificationSettingsView = {
  adminNotificationSmsEnabled: boolean;
  recipients: CommerceSmsRecipient[];
};

function newRecipientId(): string {
  return randomBytes(8).toString("hex");
}

export function parseCommerceSmsRecipients(raw: unknown): CommerceSmsRecipient[] {
  if (!Array.isArray(raw)) return [];
  const out: CommerceSmsRecipient[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const mobile =
      typeof row.mobile === "string" ? row.mobile.trim() : "";
    if (!mobile) continue;
    out.push({
      id:
        typeof row.id === "string" && row.id.trim()
          ? row.id.trim()
          : newRecipientId(),
      mobile,
      enabled: row.enabled !== false,
    });
  }
  return out;
}

export async function getCommerceNotificationSettings(
  organizationId: string,
): Promise<CommerceNotificationSettingsView> {
  const row = await prisma.commerceNotificationSettings.findUnique({
    where: { organizationId },
    select: {
      adminNotificationSmsEnabled: true,
      adminSmsRecipients: true,
    },
  });
  if (!row) {
    return { adminNotificationSmsEnabled: true, recipients: [] };
  }
  return {
    adminNotificationSmsEnabled: row.adminNotificationSmsEnabled,
    recipients: parseCommerceSmsRecipients(row.adminSmsRecipients),
  };
}

async function ensureSettingsRow(organizationId: string) {
  return prisma.commerceNotificationSettings.upsert({
    where: { organizationId },
    create: {
      organizationId,
      adminNotificationSmsEnabled: true,
      adminSmsRecipients: [],
    },
    update: {},
    select: {
      id: true,
      adminNotificationSmsEnabled: true,
      adminSmsRecipients: true,
    },
  });
}

export async function setCommerceNotificationEnabled(params: {
  organizationId: string;
  enabled: boolean;
}): Promise<CommerceNotificationSettingsView> {
  await ensureSettingsRow(params.organizationId);
  const updated = await prisma.commerceNotificationSettings.update({
    where: { organizationId: params.organizationId },
    data: { adminNotificationSmsEnabled: params.enabled },
    select: {
      adminNotificationSmsEnabled: true,
      adminSmsRecipients: true,
    },
  });
  return {
    adminNotificationSmsEnabled: updated.adminNotificationSmsEnabled,
    recipients: parseCommerceSmsRecipients(updated.adminSmsRecipients),
  };
}

export async function addCommerceNotificationRecipient(params: {
  organizationId: string;
  mobile: string;
}): Promise<
  | { ok: true; settings: CommerceNotificationSettingsView }
  | { ok: false; error: string }
> {
  const normalized = normalizeIranianMobile(params.mobile);
  if (!normalized.ok) {
    return { ok: false, error: normalized.error };
  }

  const row = await ensureSettingsRow(params.organizationId);
  const recipients = parseCommerceSmsRecipients(row.adminSmsRecipients);
  if (recipients.some((r) => r.mobile === normalized.normalized)) {
    return { ok: false, error: "این شماره از قبل در فهرست است." };
  }

  recipients.push({
    id: newRecipientId(),
    mobile: normalized.normalized,
    enabled: true,
  });

  const updated = await prisma.commerceNotificationSettings.update({
    where: { organizationId: params.organizationId },
    data: {
      adminSmsRecipients: recipients as unknown as Prisma.InputJsonValue,
    },
    select: {
      adminNotificationSmsEnabled: true,
      adminSmsRecipients: true,
    },
  });

  return {
    ok: true,
    settings: {
      adminNotificationSmsEnabled: updated.adminNotificationSmsEnabled,
      recipients: parseCommerceSmsRecipients(updated.adminSmsRecipients),
    },
  };
}

export async function removeCommerceNotificationRecipient(params: {
  organizationId: string;
  recipientId: string;
}): Promise<CommerceNotificationSettingsView> {
  const row = await ensureSettingsRow(params.organizationId);
  const recipients = parseCommerceSmsRecipients(row.adminSmsRecipients).filter(
    (r) => r.id !== params.recipientId,
  );
  const updated = await prisma.commerceNotificationSettings.update({
    where: { organizationId: params.organizationId },
    data: {
      adminSmsRecipients: recipients as unknown as Prisma.InputJsonValue,
    },
    select: {
      adminNotificationSmsEnabled: true,
      adminSmsRecipients: true,
    },
  });
  return {
    adminNotificationSmsEnabled: updated.adminNotificationSmsEnabled,
    recipients: parseCommerceSmsRecipients(updated.adminSmsRecipients),
  };
}

export async function setCommerceNotificationRecipientEnabled(params: {
  organizationId: string;
  recipientId: string;
  enabled: boolean;
}): Promise<CommerceNotificationSettingsView> {
  const row = await ensureSettingsRow(params.organizationId);
  const recipients = parseCommerceSmsRecipients(row.adminSmsRecipients).map(
    (r) =>
      r.id === params.recipientId ? { ...r, enabled: params.enabled } : r,
  );
  const updated = await prisma.commerceNotificationSettings.update({
    where: { organizationId: params.organizationId },
    data: {
      adminSmsRecipients: recipients as unknown as Prisma.InputJsonValue,
    },
    select: {
      adminNotificationSmsEnabled: true,
      adminSmsRecipients: true,
    },
  });
  return {
    adminNotificationSmsEnabled: updated.adminNotificationSmsEnabled,
    recipients: parseCommerceSmsRecipients(updated.adminSmsRecipients),
  };
}

/** Enabled mobiles for outbound admin alerts (empty if master switch off). */
export async function listEnabledCommerceAdminSmsRecipients(
  organizationId: string,
): Promise<string[]> {
  const settings = await getCommerceNotificationSettings(organizationId);
  if (!settings.adminNotificationSmsEnabled) return [];
  return settings.recipients
    .filter((r) => r.enabled)
    .map((r) => r.mobile);
}
