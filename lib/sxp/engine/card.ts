import { createHash } from "node:crypto";
import type { PortalAccountType } from "@/generated/prisma/enums";

export type CardIdentityInput = {
  organizationId: string;
  organizationName: string;
  userId: string;
  studentId: string;
  displayName: string;
  studentCode: string | null;
  nationalCode: string | null;
  gradeName: string | null;
  schoolYear: string | null;
  portraitUrl: string | null;
  branchName: string | null;
  membershipLabel: string;
  interests: string | null;
};

export type CardSnapshot = {
  displayName: string;
  studentCode: string | null;
  maskedNationalCode: string | null;
  schoolName: string;
  branchName: string | null;
  gradeName: string | null;
  schoolYear: string | null;
  membershipLabel: string;
  portraitUrl: string | null;
  qrPayload: string;
  qrTokenHash: string;
  portalId: string;
  completionRatio: number;
};

export function maskNationalCode(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 4) return null;
  return `********${digits.slice(-4)}`;
}

export function membershipLabelFor(
  accountType: PortalAccountType | "STUDENT" | "GUARDIAN",
): string {
  return accountType === "GUARDIAN" ? "ولی" : "دانش‌آموز";
}

export function computeProfileCompletion(input: {
  displayName: string | null;
  portraitUrl: string | null;
  gradeName: string | null;
  schoolYear: string | null;
  interests: string | null;
}): number {
  const checks = [
    Boolean(input.displayName?.trim()),
    Boolean(input.portraitUrl?.trim()),
    Boolean(input.gradeName?.trim()),
    Boolean(input.schoolYear?.trim()),
    Boolean(input.interests?.trim()),
  ];
  const filled = checks.filter(Boolean).length;
  return filled / checks.length;
}

export function buildQrPayload(input: {
  organizationId: string;
  userId: string;
  studentId: string;
}): { qrPayload: string; qrTokenHash: string } {
  const material = `SXP_CARD:v1:${input.organizationId}:${input.userId}:${input.studentId}`;
  const qrTokenHash = createHash("sha256").update(material).digest("hex");
  const qrPayload = `sxp-card:${qrTokenHash.slice(0, 24)}`;
  return { qrPayload, qrTokenHash };
}

export function portalIdFor(userId: string): string {
  return userId.slice(-8);
}

/**
 * Pure card projector. Hub and worker both persist this snapshot.
 * Never include live booking/CRM/commerce fields.
 */
export function buildCardSnapshot(input: CardIdentityInput): CardSnapshot {
  const qr = buildQrPayload({
    organizationId: input.organizationId,
    userId: input.userId,
    studentId: input.studentId,
  });
  return {
    displayName: input.displayName,
    studentCode: input.studentCode,
    maskedNationalCode: maskNationalCode(input.nationalCode),
    schoolName: input.organizationName,
    branchName: input.branchName,
    gradeName: input.gradeName,
    schoolYear: input.schoolYear,
    membershipLabel: input.membershipLabel,
    portraitUrl: input.portraitUrl,
    qrPayload: qr.qrPayload,
    qrTokenHash: qr.qrTokenHash,
    portalId: portalIdFor(input.userId),
    completionRatio: computeProfileCompletion({
      displayName: input.displayName,
      portraitUrl: input.portraitUrl,
      gradeName: input.gradeName,
      schoolYear: input.schoolYear,
      interests: input.interests,
    }),
  };
}
