import { CHALLENGE_GRADES, DEFAULT_CHALLENGE_SLUG, audienceKey } from "@/lib/challenge/constants";
import { CHALLENGE_QUESTION_BANK } from "@/lib/challenge/question-bank";
import { PUBLIC_ORGANIZATION_SLUG } from "@/lib/organizations/get-current-organization";
import { prisma } from "@/lib/prisma";

function validateQuestionBank(): void {
  const expectedGrades = new Set(CHALLENGE_GRADES.map((grade) => grade.key));
  const actualGrades = new Set(Object.keys(CHALLENGE_QUESTION_BANK));
  if (
    expectedGrades.size !== actualGrades.size ||
    [...expectedGrades].some((grade) => !actualGrades.has(grade))
  ) {
    throw new Error("Question bank grades do not match the configured challenge grades.");
  }

  for (const grade of CHALLENGE_GRADES) {
    const questions = CHALLENGE_QUESTION_BANK[grade.key];
    if (questions.length !== 10) {
      throw new Error(`Grade ${grade.key} must contain exactly 10 questions.`);
    }
    const prompts = new Set<string>();
    for (const question of questions) {
      if (question.prompt.trim().length < 5 || question.explanation.trim().length < 5) {
        throw new Error(`Grade ${grade.key} contains an incomplete question.`);
      }
      if (prompts.has(question.prompt)) {
        throw new Error(`Grade ${grade.key} contains a duplicate prompt.`);
      }
      prompts.add(question.prompt);
      if (question.choices.length !== 4 || new Set(question.choices).size !== 4) {
        throw new Error(`Grade ${grade.key} contains invalid choices.`);
      }
      if (question.correctIndex < 0 || question.correctIndex >= question.choices.length) {
        throw new Error(`Grade ${grade.key} contains an invalid correct answer.`);
      }
    }
  }
}

async function main() {
  validateQuestionBank();
  const organizationSlug =
    process.env.CHALLENGE_ORGANIZATION_SLUG?.trim() || PUBLIC_ORGANIZATION_SLUG;
  const campaignSlug =
    process.env.CHALLENGE_CAMPAIGN_SLUG?.trim() || DEFAULT_CHALLENGE_SLUG;

  const organization = await prisma.organization.findFirst({
    where: { slug: organizationSlug, isActive: true, deletedAt: null },
    select: { id: true, name: true },
  });
  if (!organization) throw new Error("Active challenge organization was not found.");

  const campaign = await prisma.challengeCampaign.findFirst({
    where: {
      organizationId: organization.id,
      slug: campaignSlug,
      deletedAt: null,
    },
    select: { id: true, title: true, status: true },
  });
  if (!campaign) throw new Error("Challenge campaign was not found. Run challenge:bootstrap first.");

  const prepared: Array<{
    gradeKey: string;
    examId: string;
    mode: "create" | "refresh" | "verify";
  }> = [];

  for (const grade of CHALLENGE_GRADES) {
    const exam = await prisma.challengeExam.findUnique({
      where: {
        campaignId_audienceKey: {
          campaignId: campaign.id,
          audienceKey: audienceKey(grade.key, null),
        },
      },
      include: {
        questions: {
          where: { isActive: true, deletedAt: null },
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
          include: { choices: { orderBy: { sortOrder: "asc" } } },
        },
        _count: { select: { attempts: true } },
      },
    });
    if (!exam || exam.deletedAt) {
      throw new Error(`The all-majors exam for grade ${grade.key} was not found.`);
    }

    const seeds = CHALLENGE_QUESTION_BANK[grade.key];
    const existingPrompts = new Set(exam.questions.map((question) => question.prompt));
    const bankPrompts = new Set(seeds.map((question) => question.prompt));
    const exactPromptSet =
      existingPrompts.size === bankPrompts.size &&
      [...bankPrompts].every((prompt) => existingPrompts.has(prompt));
    const existingByPrompt = new Map(
      exam.questions.map((question) => [question.prompt, question]),
    );
    const exactContent =
      exactPromptSet &&
      seeds.every((seed, questionIndex) => {
        const question = existingByPrompt.get(seed.prompt);
        return Boolean(
          question &&
            question.explanation === seed.explanation &&
            question.points === 3 &&
            question.negativePoints === 1 &&
            question.sortOrder === questionIndex + 1 &&
            question.choices.length === 4 &&
            question.choices.every(
              (choice, choiceIndex) =>
                choice.label === seed.choices[choiceIndex] &&
                choice.isCorrect === (choiceIndex === seed.correctIndex) &&
                choice.sortOrder === choiceIndex + 1,
            ),
        );
      });

    if (exam._count.attempts > 0 && !exactContent) {
      throw new Error(
        `Grade ${grade.key} already has attempts and its question content differs from the release bank; refusing to modify it.`,
      );
    }
    if (exam.questions.length > 0 && !exactPromptSet) {
      throw new Error(
        `Grade ${grade.key} already contains administrator-authored questions; refusing to replace them.`,
      );
    }

    prepared.push({
      gradeKey: grade.key,
      examId: exam.id,
      mode:
        exam.questions.length === 0
          ? "create"
          : exactContent
            ? "verify"
            : "refresh",
    });
  }

  for (const item of prepared) {
    const seeds = CHALLENGE_QUESTION_BANK[item.gradeKey];
    await prisma.$transaction(async (tx) => {
      if (item.mode === "create") {
        for (const [questionIndex, seed] of seeds.entries()) {
          await tx.challengeQuestion.create({
            data: {
              organizationId: organization.id,
              examId: item.examId,
              prompt: seed.prompt,
              explanation: seed.explanation,
              points: 3,
              negativePoints: 1,
              sortOrder: questionIndex + 1,
              choices: {
                create: seed.choices.map((label, choiceIndex) => ({
                  organizationId: organization.id,
                  label,
                  isCorrect: choiceIndex === seed.correctIndex,
                  sortOrder: choiceIndex + 1,
                })),
              },
            },
          });
        }
      } else if (item.mode === "refresh") {
        const questions = await tx.challengeQuestion.findMany({
          where: { examId: item.examId, isActive: true, deletedAt: null },
          select: { id: true, prompt: true },
        });
        const byPrompt = new Map(questions.map((question) => [question.prompt, question.id]));
        for (const [questionIndex, seed] of seeds.entries()) {
          const questionId = byPrompt.get(seed.prompt);
          if (!questionId) throw new Error(`Question disappeared while seeding grade ${item.gradeKey}.`);
          await tx.challengeChoice.deleteMany({ where: { questionId } });
          await tx.challengeQuestion.update({
            where: { id: questionId },
            data: {
              explanation: seed.explanation,
              points: 3,
              negativePoints: 1,
              sortOrder: questionIndex + 1,
              choices: {
                create: seed.choices.map((label, choiceIndex) => ({
                  organizationId: organization.id,
                  label,
                  isCorrect: choiceIndex === seed.correctIndex,
                  sortOrder: choiceIndex + 1,
                })),
              },
            },
          });
        }
      }

      await tx.challengeExam.update({
        where: { id: item.examId },
        data: {
          instructions:
            "برای هر سؤال فقط یک گزینه انتخاب کنید. پس از ثبت نهایی امکان ویرایش وجود ندارد.",
          durationMinutes: 20,
          maxAttempts: 1,
          questionLimit: 10,
          randomizeQuestions: true,
          randomizeOptions: true,
          isPublished: true,
          publishedAt: new Date(),
        },
      });
    });
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        organization: organization.name,
        campaign: campaign.title,
        campaignStatus: campaign.status,
        exams: prepared,
        totalQuestions: Object.values(CHALLENGE_QUESTION_BANK).reduce(
          (total, questions) => total + questions.length,
          0,
        ),
        note: "Exams were published. Campaign activation remains under administrator control.",
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
