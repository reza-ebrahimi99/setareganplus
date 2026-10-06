import { ChallengeCampaignStatus } from "@/generated/prisma/enums";
import {
  CHALLENGE_GRADES,
  DEFAULT_CHALLENGE_SLUG,
  audienceKey,
} from "@/lib/challenge/constants";
import { PUBLIC_ORGANIZATION_SLUG } from "@/lib/organizations/get-current-organization";
import { prisma } from "@/lib/prisma";

const activate = process.argv.includes("--activate");
const demoQuestions = process.argv.includes("--demo-questions");

const sampleQuestions = [
  {
    prompt: "حاصل ۳ × (۴ + ۲) کدام است؟",
    choices: ["۱۸", "۱۴", "۱۲", "۲۴"],
    correctIndex: 0,
  },
  {
    prompt: "اگر x + ۷ = ۱۲ باشد، مقدار x چند است؟",
    choices: ["۵", "۱۹", "۷", "۱۲"],
    correctIndex: 0,
  },
  {
    prompt: "۲۵ درصد عدد ۸۰ چند می‌شود؟",
    choices: ["۲۰", "۲۵", "۴۰", "۱۰"],
    correctIndex: 0,
  },
  {
    prompt: "محیط مربعی با ضلع ۶ سانتی‌متر چند سانتی‌متر است؟",
    choices: ["۲۴", "۳۶", "۱۲", "۱۸"],
    correctIndex: 0,
  },
  {
    prompt: "کدام کسر با یک‌دوم برابر است؟",
    choices: ["۳/۶", "۲/۳", "۴/۶", "۱/۳"],
    correctIndex: 0,
  },
];

async function main() {
  const organization = await prisma.organization.findFirst({
    where: {
      slug: process.env.CHALLENGE_ORGANIZATION_SLUG?.trim() || PUBLIC_ORGANIZATION_SLUG,
      isActive: true,
      deletedAt: null,
    },
    select: { id: true, name: true },
  });
  if (!organization) throw new Error("Active challenge organization was not found.");

  const slug = process.env.CHALLENGE_CAMPAIGN_SLUG?.trim() || DEFAULT_CHALLENGE_SLUG;
  const campaign = await prisma.challengeCampaign.upsert({
    where: {
      organizationId_slug: { organizationId: organization.id, slug },
    },
    create: {
      organizationId: organization.id,
      slug,
      title: "چالش ۵ نفره ریاضی",
      eyebrow: "چالش گروهی ستارگان",
      summary:
        "چهار دوستت را دعوت کن، آزمون ریاضی مخصوص پایه‌تان را بدهید و نتیجه تیم را با هم باز کنید.",
      description:
        "یک تجربه گروهی برای سنجش مهارت ریاضی، همکاری با دوستان و دریافت بورسیه و گواهی معتبر.",
      status: activate ? ChallengeCampaignStatus.ACTIVE : ChallengeCampaignStatus.DRAFT,
      teamSize: 5,
    },
    update: activate ? { status: ChallengeCampaignStatus.ACTIVE } : {},
  });

  const tiers = [
    { title: "ستاره طلایی", prizeLabel: "بورسیه ۵۰٪", minPercentage: 90, maxPercentage: 100, sortOrder: 1 },
    { title: "ستاره نقره‌ای", prizeLabel: "بورسیه ۳۰٪", minPercentage: 75, maxPercentage: 89.99, sortOrder: 2 },
    { title: "ستاره درخشان", prizeLabel: "بورسیه ۱۵٪", minPercentage: 50, maxPercentage: 74.99, sortOrder: 3 },
    { title: "تیم پرتلاش", prizeLabel: "گواهی رسمی چالش", minPercentage: 0, maxPercentage: 49.99, sortOrder: 4 },
  ];
  for (const tier of tiers) {
    await prisma.challengeScholarshipTier.upsert({
      where: { campaignId_title: { campaignId: campaign.id, title: tier.title } },
      create: { organizationId: organization.id, campaignId: campaign.id, ...tier },
      update: tier,
    });
  }

  for (const grade of CHALLENGE_GRADES) {
    const exam = await prisma.challengeExam.upsert({
      where: {
        campaignId_audienceKey: {
          campaignId: campaign.id,
          audienceKey: audienceKey(grade.key, null),
        },
      },
      create: {
        organizationId: organization.id,
        campaignId: campaign.id,
        audienceKey: audienceKey(grade.key, null),
        gradeKey: grade.key,
        gradeLabel: grade.label,
        title: `آزمون ریاضی ${grade.label}`,
        instructions: "برای هر سؤال فقط یک گزینه انتخاب کنید. پس از ثبت نهایی امکان ویرایش وجود ندارد.",
        durationMinutes: 20,
        maxAttempts: 1,
        questionLimit: demoQuestions ? sampleQuestions.length : null,
        randomizeQuestions: true,
        randomizeOptions: true,
        isPublished: demoQuestions,
        publishedAt: demoQuestions ? new Date() : null,
      },
      update: {},
    });

    if (demoQuestions) {
      const count = await prisma.challengeQuestion.count({
        where: { examId: exam.id, deletedAt: null },
      });
      if (count === 0) {
        for (const [index, question] of sampleQuestions.entries()) {
          await prisma.challengeQuestion.create({
            data: {
              organizationId: organization.id,
              examId: exam.id,
              prompt: question.prompt,
              sortOrder: index + 1,
              choices: {
                create: question.choices.map((label, choiceIndex) => ({
                  organizationId: organization.id,
                  label,
                  isCorrect: choiceIndex === question.correctIndex,
                  sortOrder: choiceIndex + 1,
                })),
              },
            },
          });
        }
      }
    }
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        organization: organization.name,
        campaignId: campaign.id,
        slug: campaign.slug,
        active: activate,
        demoQuestions,
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

