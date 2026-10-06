"use server";

import { revalidatePath } from "next/cache";
import { requireChallengePageContext } from "@/lib/challenge/page-context";
import { prisma } from "@/lib/prisma";
import { isPrismaUniqueConflict } from "@/lib/prisma/user-facing-error";

export type ChallengeTeamNameState = {
  status: "idle" | "success" | "error";
  message: string;
};

export async function updateChallengeTeamNameAction(
  _previous: ChallengeTeamNameState,
  formData: FormData,
): Promise<ChallengeTeamNameState> {
  const { participant, team, campaign } = await requireChallengePageContext();
  if (!participant.isCaptain) {
    return { status: "error", message: "فقط سرگروه می‌تواند نام تیم را تغییر دهد." };
  }

  const raw = formData.get("teamName");
  const teamName = typeof raw === "string" ? raw.replace(/\s+/g, " ").trim() : "";
  if (teamName.length < 3 || teamName.length > 40) {
    return { status: "error", message: "نام تیم باید بین ۳ تا ۴۰ نویسه باشد." };
  }

  const duplicate = await prisma.challengeTeam.findFirst({
    where: {
      campaignId: campaign.id,
      id: { not: team.id },
      name: { equals: teamName, mode: "insensitive" },
    },
    select: { id: true },
  });
  if (duplicate) {
    return { status: "error", message: "این نام قبلاً انتخاب شده است؛ یک نام دیگر بنویسید." };
  }

  try {
    await prisma.challengeTeam.update({
      where: { id: team.id },
      data: { name: teamName },
    });
  } catch (error) {
    return {
      status: "error",
      message: isPrismaUniqueConflict(error)
        ? "این نام قبلاً انتخاب شده است؛ یک نام دیگر بنویسید."
        : "ذخیره نام تیم انجام نشد. دوباره تلاش کنید.",
    };
  }

  revalidatePath("/team");
  revalidatePath("/dashboard");
  revalidatePath("/result");
  return { status: "success", message: "نام تیم ذخیره شد." };
}
