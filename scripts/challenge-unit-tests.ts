import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import {
  getChallengeGrade,
  validateChallengeAudience,
} from "@/lib/challenge/constants";
import {
  createChallengeToken,
  hashChallengeToken,
  seededShuffle,
} from "@/lib/challenge/crypto";
import {
  buildChallengeCertificateSvg,
  renderChallengeCertificatePdf,
  renderChallengeCertificatePng,
} from "@/lib/challenge/certificate";
import {
  parseChallengeScoringConfig,
  scoreChallengeAttempt,
} from "@/lib/challenge/scoring";
import { CHALLENGE_QUESTION_BANK } from "@/lib/challenge/question-bank";
import { formatJalaliDateTimeShort } from "@/lib/datetime/jalali";
import {
  formatDateTimeLocalInTehran,
  parseTehranDateTimeLocal,
} from "@/lib/forms/tehran-datetime";

async function main() {
  assert.deepEqual(Object.keys(CHALLENGE_QUESTION_BANK), ["7", "8", "9", "10", "11", "12"]);
  assert.equal(
    Object.values(CHALLENGE_QUESTION_BANK).reduce((total, questions) => total + questions.length, 0),
    60,
  );
  for (const questions of Object.values(CHALLENGE_QUESTION_BANK)) {
    assert.equal(questions.length, 10);
    assert.equal(new Set(questions.map((question) => question.prompt)).size, 10);
    for (const question of questions) {
      assert.equal(question.choices.length, 4);
      assert.equal(new Set(question.choices).size, 4);
      assert.ok(question.correctIndex >= 0 && question.correctIndex < 4);
      assert.ok(question.explanation.length >= 5);
    }
  }

  assert.equal(getChallengeGrade("9")?.label, "پایه نهم");
  assert.deepEqual(validateChallengeAudience("9", "math"), {
    ok: true,
    gradeKey: "9",
    gradeLabel: "پایه نهم",
    majorKey: null,
    majorLabel: null,
  });
  assert.equal(validateChallengeAudience("12", "").ok, false);
  assert.equal(validateChallengeAudience("12", "science").ok, true);

  const tehranDate = parseTehranDateTimeLocal("2026-09-28T14:30");
  assert.ok(tehranDate);
  assert.equal(tehranDate.toISOString(), "2026-09-28T11:00:00.000Z");
  assert.equal(formatDateTimeLocalInTehran(tehranDate), "2026-09-28T14:30");
  assert.equal(formatJalaliDateTimeShort(tehranDate), "۱۴۰۵/۰۷/۰۶ ۱۴:۳۰");
  assert.equal(parseTehranDateTimeLocal("2026-02-31T10:00"), null);

  const weights = parseChallengeScoringConfig({ correct: 3, wrong: -1, unanswered: 0 });
  assert.deepEqual(
    scoreChallengeAttempt({
      correctCount: 8,
      wrongCount: 1,
      unansweredCount: 1,
      weights,
    }),
    { rawScore: 23, maxScore: 30, percentage: 76.67 },
  );
  assert.equal(
    scoreChallengeAttempt({
      correctCount: 0,
      wrongCount: 10,
      unansweredCount: 0,
      weights,
    }).percentage,
    0,
  );

  const token = createChallengeToken();
  assert.ok(token.length >= 30);
  const invitationToken = createChallengeToken(15);
  assert.equal(invitationToken.length, 20);
  assert.equal(hashChallengeToken(token), hashChallengeToken(token));
  assert.notEqual(hashChallengeToken(token), hashChallengeToken(`${token}x`));
  const values = ["a", "b", "c", "d", "e"];
  assert.deepEqual(seededShuffle(values, "same-seed"), seededShuffle(values, "same-seed"));
  assert.deepEqual([...seededShuffle(values, "same-seed")].sort(), values);

  const certificate = {
    verificationCode: "ABCDEF1234567890",
    serialNumber: "SP-2026-ABCDEF1234",
    issuedAt: new Date("2026-09-27T12:00:00Z"),
    metadata: null,
    participant: { fullName: "دانش‌آموز نمونه", gradeLabel: "پایه نهم" },
    team: {
      name: "تیم ستاره",
      averagePercentage: 82.5,
      scholarshipTier: { title: "ستاره نقره‌ای", prizeLabel: "بورسیه ۳۰٪" },
    },
    campaign: {
      title: "چالش ۵ نفره ریاضی",
      certificateTitle: "گواهی حضور در چالش ۵ نفره ریاضی",
      certificateSubtitle: "به پاس تلاش و همراهی در این چالش اهدا می‌شود.",
      certificateSignatory: "مجموعه آموزشی ستارگان پلاس",
      certificateRole: "مدیریت آموزش",
    },
  } as Parameters<typeof buildChallengeCertificateSvg>[0];
  const svg = buildChallengeCertificateSvg(certificate);
  assert.ok(svg.includes("دانش‌آموز نمونه"));
  const [png, pdf] = await Promise.all([
    renderChallengeCertificatePng(certificate),
    renderChallengeCertificatePdf(certificate),
  ]);
  assert.equal(png.subarray(1, 4).toString("ascii"), "PNG");
  assert.equal(pdf.subarray(0, 8).toString("ascii"), "%PDF-1.4");
  assert.ok(pdf.length > 10_000);
  if (process.env.CHALLENGE_CERT_PREVIEW) {
    await writeFile(process.env.CHALLENGE_CERT_PREVIEW, png);
  }
  if (process.env.CHALLENGE_CERT_PDF_PREVIEW) {
    await writeFile(process.env.CHALLENGE_CERT_PDF_PREVIEW, pdf);
  }

  console.log("challenge unit tests: ok");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
