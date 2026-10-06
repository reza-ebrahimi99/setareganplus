"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { readSessionRequestMetadata } from "@/lib/auth/session";
import { requireChallengeSession } from "@/lib/challenge/auth/session";
import { getConfiguredChallengeCampaign } from "@/lib/challenge/config";
import { getChallengeParticipant } from "@/lib/challenge/data";
import {
  startChallengeAttempt,
  submitChallengeAttempt,
} from "@/lib/challenge/exam";
import { createChallengeInvitation } from "@/lib/challenge/invitations";
import { revokePortalSessionCookie } from "@/lib/portal/auth/session";

function field(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export async function logoutChallengeAction(): Promise<void> {
  await revokePortalSessionCookie();
  redirect("/");
}

export type InviteFriendState = {
  ok?: boolean;
  error?: string;
  message?: string;
  inviteUrl?: string;
};

export async function inviteChallengeFriendAction(
  _previous: InviteFriendState,
  formData: FormData,
): Promise<InviteFriendState> {
  const session = await requireChallengeSession();
  const campaign = await getConfiguredChallengeCampaign();
  if (!campaign || campaign.organizationId !== session.organizationId) {
    return { error: "کمپین پیدا نشد." };
  }
  const participant = await getChallengeParticipant(session, campaign.id);
  if (!participant) return { error: "عضویت شما در چالش پیدا نشد." };

  const result = await createChallengeInvitation({
    organizationId: session.organizationId,
    campaignId: campaign.id,
    participantId: participant.id,
    inviteeName: field(formData, "inviteeName"),
    mobile: field(formData, "mobile"),
  });
  if (!result.ok) return { error: result.error };
  revalidatePath("/challenge/team");
  return {
    ok: true,
    message: result.message,
    inviteUrl: result.inviteUrl,
  };
}

export async function startChallengeExamAction(): Promise<void> {
  const session = await requireChallengeSession();
  const campaign = await getConfiguredChallengeCampaign();
  if (!campaign || campaign.organizationId !== session.organizationId) {
    redirect("/login");
  }
  const participant = await getChallengeParticipant(session, campaign.id);
  if (!participant) redirect("/login");
  const metadata = await readSessionRequestMetadata();
  const result = await startChallengeAttempt({
    organizationId: session.organizationId,
    campaignId: campaign.id,
    participantId: participant.id,
    ...metadata,
  });
  if (!result.ok) {
    redirect(`/exam?error=${encodeURIComponent(result.error)}`);
  }
  if (result.alreadySubmitted) redirect("/result");
  redirect(`/exam/${result.attemptId}`);
}

export async function submitChallengeExamAction(formData: FormData): Promise<void> {
  const session = await requireChallengeSession();
  const campaign = await getConfiguredChallengeCampaign();
  if (!campaign || campaign.organizationId !== session.organizationId) {
    redirect("/login");
  }
  const participant = await getChallengeParticipant(session, campaign.id);
  if (!participant) redirect("/login");
  const attemptId = field(formData, "attemptId");
  const answers: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (!key.startsWith("answer:") || typeof value !== "string") continue;
    const questionId = key.slice("answer:".length);
    if (questionId) answers[questionId] = value;
  }
  const result = await submitChallengeAttempt({
    attemptId,
    participantId: participant.id,
    organizationId: session.organizationId,
    answers,
  });
  if (!result.ok) {
    redirect(`/exam/${attemptId}?error=${encodeURIComponent(result.error)}`);
  }
  revalidatePath("/challenge/dashboard");
  revalidatePath("/challenge/team");
  revalidatePath("/challenge/result");
  redirect("/result");
}

