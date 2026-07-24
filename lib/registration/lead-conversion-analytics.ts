/**
 * Lead → Registration conversion analytics (read-only aggregates).
 */

import { prisma } from "@/lib/prisma";
import { parseAttributionFromUnknown } from "@/lib/registration/attribution";
import { parseLeadLinkFromMetadata } from "@/lib/registration/lead-link";

export type LeadRegistrationConversionReport = {
  totalLeads: number;
  leadsWithRegistration: number;
  conversionRate: number;
  averageDaysToRegister: number | null;
  byConsultant: Array<{
    ownerUserId: string;
    ownerName: string;
    leads: number;
    registrations: number;
    paidRegistrations: number;
    revenueRials: number;
    conversionRate: number;
  }>;
  bySource: Array<{
    source: string;
    leads: number;
    registrations: number;
    revenueRials: number;
    conversionRate: number;
  }>;
  todayRegistrations: number;
  todayLeadConversions: number;
};

function daysBetween(a: Date, b: Date): number {
  return Math.max(0, (b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

export async function getLeadRegistrationConversionReport(
  organizationId: string,
): Promise<LeadRegistrationConversionReport> {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [leads, registrations] = await Promise.all([
    prisma.lead.findMany({
      where: { organizationId, deletedAt: null },
      select: {
        id: true,
        source: true,
        ownerUserId: true,
        createdAt: true,
        owner: { select: { firstName: true, lastName: true } },
      },
    }),
    prisma.registration.findMany({
      where: {
        organizationId,
        deletedAt: null,
        status: { notIn: ["CANCELLED", "REJECTED"] },
      },
      select: {
        id: true,
        leadId: true,
        finalAmountRials: true,
        paymentStatus: true,
        createdAt: true,
        metadata: true,
      },
    }),
  ]);

  const regsByLead = new Map<string, typeof registrations>();
  for (const reg of registrations) {
    if (!reg.leadId) continue;
    const list = regsByLead.get(reg.leadId) ?? [];
    list.push(reg);
    regsByLead.set(reg.leadId, list);
  }

  const leadsWithRegistration = leads.filter((l) => regsByLead.has(l.id)).length;
  const conversionGaps: number[] = [];
  for (const lead of leads) {
    const regs = regsByLead.get(lead.id);
    if (!regs?.length) continue;
    const first = regs.reduce((min, r) =>
      r.createdAt < min.createdAt ? r : min,
    );
    conversionGaps.push(daysBetween(lead.createdAt, first.createdAt));
  }

  const consultantMap = new Map<
    string,
    {
      ownerUserId: string;
      ownerName: string;
      leads: number;
      registrations: number;
      paidRegistrations: number;
      revenueRials: number;
    }
  >();

  for (const lead of leads) {
    const key = lead.ownerUserId ?? "__unassigned__";
    const name = lead.owner
      ? `${lead.owner.firstName} ${lead.owner.lastName}`.trim()
      : "بدون مشاور";
    const row = consultantMap.get(key) ?? {
      ownerUserId: key,
      ownerName: name,
      leads: 0,
      registrations: 0,
      paidRegistrations: 0,
      revenueRials: 0,
    };
    row.leads += 1;
    const regs = regsByLead.get(lead.id) ?? [];
    if (regs.length > 0) {
      row.registrations += 1;
      for (const reg of regs) {
        row.revenueRials += reg.finalAmountRials;
        if (reg.paymentStatus === "PAID" || reg.paymentStatus === "WAIVED") {
          row.paidRegistrations += 1;
        }
      }
    }
    consultantMap.set(key, row);
  }

  const sourceMap = new Map<
    string,
    { source: string; leads: number; registrations: number; revenueRials: number }
  >();
  for (const lead of leads) {
    const source = lead.source || "OTHER";
    const row = sourceMap.get(source) ?? {
      source,
      leads: 0,
      registrations: 0,
      revenueRials: 0,
    };
    row.leads += 1;
    const regs = regsByLead.get(lead.id) ?? [];
    if (regs.length > 0) {
      row.registrations += 1;
      row.revenueRials += regs.reduce((s, r) => s + r.finalAmountRials, 0);
    }
    sourceMap.set(source, row);
  }

  // Also attribute by registration acquisition source when present
  for (const reg of registrations) {
    const attr = parseAttributionFromUnknown(reg.metadata);
    const source =
      attr?.utmSource ||
      attr?.acquisitionSource ||
      parseLeadLinkFromMetadata(reg.metadata)?.leadSource ||
      null;
    if (!source) continue;
    const key = `acq:${source}`;
    const row = sourceMap.get(key) ?? {
      source: key,
      leads: 0,
      registrations: 0,
      revenueRials: 0,
    };
    row.registrations += 1;
    row.revenueRials += reg.finalAmountRials;
    sourceMap.set(key, row);
  }

  const todayRegistrations = registrations.filter(
    (r) => r.createdAt >= startOfToday,
  ).length;
  const todayLeadConversions = leads.filter((l) => {
    const regs = regsByLead.get(l.id);
    return regs?.some((r) => r.createdAt >= startOfToday);
  }).length;

  return {
    totalLeads: leads.length,
    leadsWithRegistration,
    conversionRate:
      leads.length > 0 ? leadsWithRegistration / leads.length : 0,
    averageDaysToRegister:
      conversionGaps.length > 0
        ? Math.round(
            (conversionGaps.reduce((a, b) => a + b, 0) / conversionGaps.length) *
              10,
          ) / 10
        : null,
    byConsultant: [...consultantMap.values()]
      .map((row) => ({
        ...row,
        conversionRate: row.leads > 0 ? row.registrations / row.leads : 0,
      }))
      .sort((a, b) => b.revenueRials - a.revenueRials),
    bySource: [...sourceMap.values()]
      .map((row) => ({
        ...row,
        conversionRate: row.leads > 0 ? row.registrations / row.leads : 0,
      }))
      .sort((a, b) => b.registrations - a.registrations),
    todayRegistrations,
    todayLeadConversions,
  };
}
