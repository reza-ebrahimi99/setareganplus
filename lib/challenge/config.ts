import { ChallengeCampaignStatus } from "@/generated/prisma/enums";
import { DEFAULT_CHALLENGE_SLUG } from "@/lib/challenge/constants";
import { getPublicOrganizationBySlug } from "@/lib/organizations/get-current-organization";
import { prisma } from "@/lib/prisma";

export async function getChallengeOrganizationId(): Promise<string> {
  const slug = process.env.CHALLENGE_ORGANIZATION_SLUG?.trim() || undefined;
  const organization = await getPublicOrganizationBySlug(slug);
  return organization.id;
}

export async function getActiveChallengeCampaign() {
  const campaign = await getConfiguredChallengeCampaign();
  if (!campaign) return null;
  const now = new Date();
  if (
    campaign.status !== ChallengeCampaignStatus.ACTIVE ||
    (campaign.startsAt && campaign.startsAt > now) ||
    (campaign.endsAt && campaign.endsAt <= now)
  ) {
    return null;
  }
  return campaign;
}

export async function getConfiguredChallengeCampaign() {
  const organizationId = await getChallengeOrganizationId();
  const slug = process.env.CHALLENGE_CAMPAIGN_SLUG?.trim() || DEFAULT_CHALLENGE_SLUG;
  return prisma.challengeCampaign.findFirst({
    where: {
      organizationId,
      slug,
      deletedAt: null,
    },
  });
}

export async function requireActiveChallengeCampaign() {
  const campaign = await getActiveChallengeCampaign();
  if (!campaign) throw new Error("CHALLENGE_NOT_ACTIVE");
  return campaign;
}
