"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePerm } from "@/lib/auth";
import { FOLLOW } from "@/lib/journey/catalog";

export async function setFollowUp(formData: FormData) {
  await requirePerm("journey.manage");
  const id = String(formData.get("id") ?? "");
  const followUp = String(formData.get("followUp") ?? "");
  if (!FOLLOW.some((f) => f.id === followUp)) redirect(`/admin/journey/${id}`);
  await prisma.journeyRun.update({ where: { id }, data: { followUp, fresh: false } });
  revalidatePath("/admin/journey");
  redirect(`/admin/journey/${id}?ok=1`);
}

export async function saveJourneyNote(formData: FormData) {
  await requirePerm("journey.manage");
  const id = String(formData.get("id") ?? "");
  const adminNote = String(formData.get("adminNote") ?? "").trim().slice(0, 4000);
  await prisma.journeyRun.update({ where: { id }, data: { adminNote } });
  revalidatePath(`/admin/journey/${id}`);
  redirect(`/admin/journey/${id}?ok=note`);
}

export async function saveQuestion(formData: FormData) {
  await requirePerm("journey.manage");
  const id = String(formData.get("id") ?? "").trim();
  const skillSlug = String(formData.get("skillSlug") ?? "");
  const stem = String(formData.get("stem") ?? "").trim();
  const explain = String(formData.get("explain") ?? "").trim();
  const correct = Number(formData.get("correct") ?? 0);
  const texts = [0, 1, 2, 3].map((i) => String(formData.get(`opt${i}`) ?? "").trim());
  const misses = [0, 1, 2, 3].map((i) => String(formData.get(`miss${i}`) ?? "").trim());
  if (!stem || !explain || texts.some((t) => !t)) redirect("/admin/journey/questions?e=1");
  const skill = await prisma.journeySkill.findUnique({ where: { slug: skillSlug } });
  if (!skill) redirect("/admin/journey/questions?e=1");
  const qid = id || `custom-${Date.now().toString(36)}`;
  await prisma.journeyQuestion.upsert({
    where: { id: qid },
    create: { id: qid, skillSlug, stem, explain, sortOrder: 50 },
    update: { skillSlug, stem, explain, active: true },
  });
  await prisma.journeyOption.deleteMany({ where: { questionId: qid } });
  await prisma.journeyOption.createMany({
    data: texts.map((text, i) => ({
      id: `${qid}-${i}`,
      questionId: qid,
      text,
      correct: i === correct,
      misconception: i === correct ? "" : misses[i],
      sortOrder: i,
    })),
  });
  revalidatePath("/admin/journey/questions");
  redirect("/admin/journey/questions?ok=1");
}

export async function hideQuestion(formData: FormData) {
  await requirePerm("journey.manage");
  const id = String(formData.get("id") ?? "");
  await prisma.journeyQuestion.update({ where: { id }, data: { active: false } });
  revalidatePath("/admin/journey/questions");
  redirect("/admin/journey/questions");
}
