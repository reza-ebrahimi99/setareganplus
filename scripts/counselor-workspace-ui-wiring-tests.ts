/**
 * Proves counselor queue + next-action + steps 11–18 workspace components export and rail logic.
 */

import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CounselorNextActionSection } from "../components/counselor-os/CounselorNextActionSection";
import { CounselorWorkQueuePanel } from "../components/counselor-os/CounselorWorkQueuePanel";
import { buildSteps1118Rail, visualStateLabelFa } from "../lib/counselor-os/steps-11-18-rail";
import { WORK_QUEUE_BUCKET_LABELS } from "../lib/counselor-os/work-queue-priority";
import type { WorkQueueModel } from "../lib/counselor-os/work-queue";
import type { NextActionCard } from "../lib/guidance/journey-v2/next-action";

const sampleCard: NextActionCard = {
  currentStep: 13,
  currentStepTitle: "چیدمان اولیه",
  lastCompletedStep: 12,
  actionLabel: "تکمیل چیدمان و انتشار نسخه اولیه",
  owner: "counselor",
  ownerLabel: "مشاور",
  state: "ready",
  blockerReason: null,
  href: "/admin/counselor/students/demo#cos-steps1118",
  dueLabel: null,
  progress11to18: [
    { step: 11, shortTitle: "جلسه اول", status: "done" },
    { step: 12, shortTitle: "کنکور", status: "done" },
    { step: 13, shortTitle: "چیدمان", status: "in_progress" },
    { step: 14, shortTitle: "بازبینی", status: "locked" },
    { step: 15, shortTitle: "جلسه ۲", status: "locked" },
    { step: 16, shortTitle: "نهایی", status: "locked" },
    { step: 17, shortTitle: "تأیید", status: "locked" },
    { step: 18, shortTitle: "سنجش", status: "locked" },
  ],
};

const nextHtml = renderToStaticMarkup(
  createElement(CounselorNextActionSection, {
    view: { kind: "card", card: sampleCard },
    waitingDaysLabel: "۳ روز",
  }),
);
assert.match(nextHtml, /اقدام بعدی/);
assert.match(nextHtml, /انجام اقدام/);

const incompleteHtml = renderToStaticMarkup(
  createElement(CounselorNextActionSection, {
    view: {
      kind: "incomplete",
      message: "برای تعیین اقدام بعدی، اطلاعات این پرونده نیازمند تکمیل است.",
    },
  }),
);
assert.match(incompleteHtml, /نیازمند تکمیل/);

const emptyQueue: WorkQueueModel = {
  all: [],
  buckets: {
    urgent: [],
    today: [],
    overdue: [],
    waiting_me: [],
    waiting_student: [],
    sessions_today: [],
    incomplete_arrangement: [],
    returned_reviews: [],
    ready_finalize: [],
    ready_sanjesh: [],
    recently_done: [],
  },
  counts: {
    urgent: 0,
    today: 0,
    overdue: 0,
    waiting_me: 0,
    waiting_student: 0,
    sessions_today: 0,
    incomplete_arrangement: 0,
    returned_reviews: 0,
    ready_finalize: 0,
    ready_sanjesh: 0,
    recently_done: 0,
  },
  bucketLabels: WORK_QUEUE_BUCKET_LABELS,
};

const queueHtml = renderToStaticMarkup(
  createElement(CounselorWorkQueuePanel, { model: emptyQueue, bucket: "all" }),
);
assert.match(queueHtml, /صف کاری من/);
assert.match(queueHtml, /فوری/);
assert.match(queueHtml, /صف خالی/);

const rail = buildSteps1118Rail({
  timeline: [],
  currentStep: 13,
  progressChips: sampleCard.progress11to18,
});
assert.equal(rail.length, 8);
assert.equal(rail[0]?.step, 11);
assert.ok(visualStateLabelFa("locked").includes("قفل"));

console.log("counselor workspace UI wiring tests passed");
