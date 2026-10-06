import "server-only";

import { redirect } from "next/navigation";
import { requireChallengeSession } from "@/lib/challenge/auth/session";
import { getConfiguredChallengeCampaign } from "@/lib/challenge/config";
import { getChallengeParticipant } from "@/lib/challenge/data";

export async function requireChallengePageContext() {
  let session;
  try {
    session = await requireChallengeSession();
  } catch {
    redirect("/login");
  }
  const campaign = await getConfiguredChallengeCampaign();
  if (!campaign || campaign.organizationId !== session.organizationId) {
    redirect("/login");
  }
  const participant = await getChallengeParticipant(session, campaign.id);
  if (!participant?.team) redirect("/login");
  return { session, campaign, participant, team: participant.team };
}

