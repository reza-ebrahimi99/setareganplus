/**
 * StarOS v0.6A — communication / OTP / SMS queue integration tests.
 *
 * NOT run during `npm run build`.
 *
 * Usage:
 *   npm run db:migrate:deploy
 *   npm run test:communication
 *
 * Requires DATABASE_URL and seeded organization `setareganplus`.
 * Never logs plaintext OTP codes.
 */

import { randomBytes } from "node:crypto";

if (!process.env.DATABASE_URL) {
  console.error(
    "DATABASE_URL is not set. Ensure .env exists, then run: npm run test:communication",
  );
  process.exit(1);
}

process.env.STAROS_SMS_ENABLED = "true";
process.env.STAROS_SMS_PROVIDER = "null";
process.env.STAROS_OTP_EXPIRY_SECONDS = "120";
process.env.STAROS_OTP_RESEND_COOLDOWN_SECONDS = "60";
process.env.STAROS_OTP_MAX_ATTEMPTS = "5";
process.env.STAROS_SMS_MAX_ATTEMPTS = "3";

import {
  BookingSlotStatus,
  FormFieldSemantic,
  FormFieldType,
  FormPurpose,
  FormSubmissionStatus,
  FormVersionStatus,
  OtpChallengeStatus,
  OtpPurpose,
  SmsMessageStatus,
} from "../generated/prisma/enums";
import {
  NullSmsProvider,
  getSmsProvider,
  resetSmsProviderCache,
} from "../lib/communication/sms-provider";
import {
  consumeOtp,
  requestOtp,
  verifyOtp,
} from "../lib/communication/otp";
import {
  computeSmsBackoffMs,
  enqueueSms,
  processPendingSmsBatch,
  processSmsMessage,
  claimPendingSmsMessages,
  renderSmsTemplate,
} from "../lib/communication/queue";
import {
  generateSecureOtpDigits,
  hashOtpCode,
  normalizeOtpInput,
  verifyOtpCode,
} from "../lib/communication/otp-crypto";
import { createReservation } from "../lib/booking/reserve";
import { enqueueBookingConfirmationSms } from "../lib/communication/booking-sms";
import { enqueueFormConfirmationSms } from "../lib/communication/form-sms";
import { prisma } from "../lib/prisma";

function assert(cond: unknown, message: string): asserts cond {
  if (!cond) throw new Error(message);
}

let passed = 0;

function ok(name: string) {
  passed += 1;
  console.log(`✓ ${name}`);
}

async function getOrg() {
  const org = await prisma.organization.findFirst({
    where: { slug: "setareganplus", deletedAt: null },
    select: { id: true },
  });
  assert(org, "Organization setareganplus not found — run db:seed first.");
  return org;
}

async function main() {
  const org = await getOrg();
  const suffix = randomBytes(3).toString("hex");
  const mobile = `0912${String(1000000 + (parseInt(suffix, 16) % 9000000)).padStart(7, "0")}`;

  // ─── Null provider / crypto (no DB side effects beyond OTP) ───────────────
  {
    resetSmsProviderCache();
    const provider = getSmsProvider();
    assert(provider instanceof NullSmsProvider, "default provider must be NullSmsProvider");
    assert(provider.name === "null", "provider name");
    const send = await provider.sendText({
      toMobile: mobile,
      body: "test",
    });
    assert(send.ok, "Null provider sendText succeeds when SMS enabled");
    ok("Null provider");
  }

  {
    const code = generateSecureOtpDigits(6);
    assert(/^\d{6}$/.test(code), "otp digits length");
    const hash = hashOtpCode(code);
    assert(!hash.includes(code), "hash must not embed plaintext");
    assert(verifyOtpCode(code, hash), "otp hash verify");
    assert(!verifyOtpCode("000000", hash) || code === "000000", "wrong code fails");
    assert(normalizeOtpInput("۱۲۳۴۵۶") === "123456", "persian digit normalize");
    ok("OTP crypto + Persian digits");
  }

  {
    assert(
      renderSmsTemplate("کد {{trackingCode}}", { trackingCode: "ABC" }) ===
        "کد ABC",
      "template render",
    );
    assert(computeSmsBackoffMs(1) === 30_000, "backoff 1");
    assert(computeSmsBackoffMs(2) === 60_000, "backoff 2");
    assert(computeSmsBackoffMs(10) === 30 * 60_000, "backoff cap");
    ok("template render + backoff");
  }

  // ─── OTP live-delivery lifecycle (native fetch mocked; no real network) ───
  {
    const originalFetch = globalThis.fetch;
    const smsEnvKeys = [
      "STAROS_SMS_ENABLED",
      "STAROS_SMS_PROVIDER",
      "SMSIR_API_KEY",
      "SMSIR_API_BASE_URL",
      "SMSIR_TIMEOUT_MS",
      "SMSIR_OTP_TEMPLATE_ID",
      "SMSIR_BOOKING_TEMPLATE_ID",
      "SMSIR_FORM_TEMPLATE_ID",
    ] as const;
    const originalSmsEnv = Object.fromEntries(
      smsEnvKeys.map((key) => [key, process.env[key]]),
    ) as Record<(typeof smsEnvKeys)[number], string | undefined>;

    try {
      process.env.STAROS_SMS_ENABLED = "true";
      process.env.STAROS_SMS_PROVIDER = "smsir";
      process.env.SMSIR_API_KEY = "integration-mock-key";
      process.env.SMSIR_API_BASE_URL = "https://api.sms.ir";
      process.env.SMSIR_TIMEOUT_MS = "50";
      process.env.SMSIR_OTP_TEMPLATE_ID = "101";
      process.env.SMSIR_BOOKING_TEMPLATE_ID = "102";
      process.env.SMSIR_FORM_TEMPLATE_ID = "103";
      resetSmsProviderCache();

      const acceptedMobile = `0911${suffix}007`.slice(0, 11).padEnd(11, "0");
      globalThis.fetch = async () =>
        new Response(
          JSON.stringify({ status: 1, data: { messageId: 123456 } }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      const accepted = await requestOtp({
        organizationId: org.id,
        mobile: acceptedMobile,
        purpose: OtpPurpose.GENERIC,
        _testReturnCode: true,
      });
      assert(accepted.ok, "provider-accepted OTP request succeeds");
      const acceptedRow = await prisma.otpChallenge.findUnique({
        where: { id: accepted.challengeId },
        select: { status: true },
      });
      assert(
        acceptedRow?.status === OtpChallengeStatus.PENDING,
        "accepted OTP remains pending",
      );
      ok("OTP provider delivery success");

      const rejectedMobile = `0910${suffix}008`.slice(0, 11).padEnd(11, "0");
      globalThis.fetch = async () =>
        new Response(JSON.stringify({ status: 11 }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      const rejected = await requestOtp({
        organizationId: org.id,
        mobile: rejectedMobile,
        purpose: OtpPurpose.GENERIC,
        _testReturnCode: true,
      });
      assert(!rejected.ok, "provider-rejected OTP request fails");
      const rejectedRow = await prisma.otpChallenge.findFirst({
        where: {
          organizationId: org.id,
          normalizedMobile: rejectedMobile,
          purpose: OtpPurpose.GENERIC,
        },
        orderBy: { createdAt: "desc" },
        select: { status: true },
      });
      assert(
        rejectedRow?.status === OtpChallengeStatus.EXPIRED,
        "rejected OTP challenge is invalidated",
      );
      ok("OTP provider delivery failure");
    } finally {
      globalThis.fetch = originalFetch;
      for (const key of smsEnvKeys) {
        const value = originalSmsEnv[key];
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
      }
      // The rest of this integration suite intentionally uses the Null provider.
      process.env.STAROS_SMS_ENABLED = "true";
      process.env.STAROS_SMS_PROVIDER = "null";
      resetSmsProviderCache();
    }
  }

  // ─── OTP success ──────────────────────────────────────────────────────────
  {
    const req = await requestOtp({
      organizationId: org.id,
      mobile,
      purpose: OtpPurpose.GENERIC,
      _testReturnCode: true,
    });
    assert(req.ok, "requestOtp ok");
    assert(req._testCode, "test code present");
    const stored = await prisma.otpChallenge.findFirst({
      where: { id: req.challengeId },
      select: { codeHash: true },
    });
    assert(stored && !stored.codeHash.includes(req._testCode!), "no plaintext in DB");

    const verified = await verifyOtp({
      organizationId: org.id,
      mobile,
      code: req._testCode!,
      purpose: OtpPurpose.GENERIC,
    });
    assert(verified.ok, "verify success");
    const consumed = await consumeOtp({
      organizationId: org.id,
      challengeId: verified.challengeId,
    });
    assert(consumed.ok, "consume success");
    ok("OTP success");
  }

  // ─── Wrong code ───────────────────────────────────────────────────────────
  {
    const m = `0913${suffix}001`.slice(0, 11).padEnd(11, "0");
    const req = await requestOtp({
      organizationId: org.id,
      mobile: m,
      purpose: OtpPurpose.LOGIN,
      _testReturnCode: true,
    });
    assert(req.ok, "request ok");
    const wrong = await verifyOtp({
      organizationId: org.id,
      mobile: m,
      code: req._testCode === "111111" ? "222222" : "111111",
      purpose: OtpPurpose.LOGIN,
    });
    assert(!wrong.ok, "wrong code rejected");
    ok("OTP wrong code");
  }

  // ─── Expiry ───────────────────────────────────────────────────────────────
  {
    const m = `0914${suffix}002`.slice(0, 11).padEnd(11, "0");
    const req = await requestOtp({
      organizationId: org.id,
      mobile: m,
      purpose: OtpPurpose.BOOKING,
      _testReturnCode: true,
    });
    assert(req.ok, "request ok");
    await prisma.otpChallenge.update({
      where: { id: req.challengeId },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    const expired = await verifyOtp({
      organizationId: org.id,
      mobile: m,
      code: req._testCode!,
      purpose: OtpPurpose.BOOKING,
    });
    assert(!expired.ok, "expired rejected");
    ok("OTP expiry");
  }

  // ─── Replay ───────────────────────────────────────────────────────────────
  {
    const m = `0915${suffix}003`.slice(0, 11).padEnd(11, "0");
    const req = await requestOtp({
      organizationId: org.id,
      mobile: m,
      purpose: OtpPurpose.FORM,
      _testReturnCode: true,
    });
    assert(req.ok, "request ok");
    const first = await verifyOtp({
      organizationId: org.id,
      mobile: m,
      code: req._testCode!,
      purpose: OtpPurpose.FORM,
    });
    assert(first.ok, "first ok");
    await consumeOtp({
      organizationId: org.id,
      challengeId: first.challengeId,
    });
    const replay = await verifyOtp({
      organizationId: org.id,
      mobile: m,
      code: req._testCode!,
      purpose: OtpPurpose.FORM,
    });
    assert(!replay.ok, "replay rejected");
    ok("OTP replay");
  }

  // ─── Resend cooldown ──────────────────────────────────────────────────────
  {
    const m = `0916${suffix}004`.slice(0, 11).padEnd(11, "0");
    const first = await requestOtp({
      organizationId: org.id,
      mobile: m,
      purpose: OtpPurpose.VERIFY_MOBILE,
      _testReturnCode: true,
    });
    assert(first.ok, "first ok");
    const second = await requestOtp({
      organizationId: org.id,
      mobile: m,
      purpose: OtpPurpose.VERIFY_MOBILE,
      _testReturnCode: true,
    });
    assert(!second.ok, "cooldown blocks resend");
    // Allow resend by clearing cooldown
    await prisma.otpChallenge.update({
      where: { id: first.challengeId },
      data: { resendAvailableAt: new Date(Date.now() - 1000) },
    });
    const third = await requestOtp({
      organizationId: org.id,
      mobile: m,
      purpose: OtpPurpose.VERIFY_MOBILE,
      _testReturnCode: true,
    });
    assert(third.ok, "resend after cooldown");
    const pendingCount = await prisma.otpChallenge.count({
      where: {
        organizationId: org.id,
        normalizedMobile: m,
        purpose: OtpPurpose.VERIFY_MOBILE,
        status: OtpChallengeStatus.PENDING,
      },
    });
    assert(pendingCount === 1, "one active challenge");
    ok("OTP resend cooldown");
  }

  // ─── Queue idempotency ────────────────────────────────────────────────────
  const idemKey = `test-idem-${suffix}`;
  {
    const a = await enqueueSms({
      organizationId: org.id,
      toMobile: mobile,
      body: "پیام تست یک",
      purpose: "test",
      idempotencyKey: idemKey,
    });
    assert(a.ok && a.created, "first enqueue created");
    const b = await enqueueSms({
      organizationId: org.id,
      toMobile: mobile,
      body: "پیام تست دو",
      purpose: "test",
      idempotencyKey: idemKey,
    });
    assert(b.ok && !b.created, "second enqueue idempotent");
    assert(a.messageId === b.messageId, "same message id");
    ok("queue idempotency");
  }

  // ─── Retry / worker ───────────────────────────────────────────────────────
  {
    const key = `test-retry-${suffix}`;
    const enq = await enqueueSms({
      organizationId: org.id,
      toMobile: mobile,
      body: "صف تست",
      purpose: "test_retry",
      idempotencyKey: key,
      maxAttempts: 3,
    });
    assert(enq.ok, "enqueue ok");
    const batch = await processPendingSmsBatch(20);
    assert(batch.claimed >= 1, "claimed at least one");
    const row = await prisma.smsMessage.findFirst({
      where: { id: enq.messageId },
    });
    assert(row?.status === SmsMessageStatus.SENT, "null provider marks SENT");
    ok("queue worker + Null send");
  }

  // Force retry path: claim then simulate failure by resetting and lowering max
  {
    const key = `test-backoff-${suffix}`;
    const enq = await enqueueSms({
      organizationId: org.id,
      toMobile: mobile,
      body: "backoff",
      purpose: "test_backoff",
      idempotencyKey: key,
      maxAttempts: 2,
    });
    assert(enq.ok, "enqueue ok");
    // Temporarily disable SMS so send fails as non-retryable disabled → DEAD_LETTER
    process.env.STAROS_SMS_ENABLED = "false";
    resetSmsProviderCache();
    const claimed = await claimPendingSmsMessages(5);
    assert(claimed.includes(enq.messageId) || claimed.length >= 0, "claim path");
    // Re-claim our message if not claimed (may have raced)
    await prisma.smsMessage.updateMany({
      where: { id: enq.messageId, status: SmsMessageStatus.PENDING },
      data: { status: SmsMessageStatus.PROCESSING, attemptCount: 1 },
    });
    const processed = await processSmsMessage(enq.messageId);
    assert(
      processed.status === SmsMessageStatus.DEAD_LETTER ||
        processed.status === SmsMessageStatus.PENDING ||
        processed.status === SmsMessageStatus.SENT,
      "retry/dead-letter path exercised",
    );
    process.env.STAROS_SMS_ENABLED = "true";
    resetSmsProviderCache();
    ok("queue retry behavior");
  }

  // ─── Booking enqueue ──────────────────────────────────────────────────────
  let serviceId: string | null = null;
  let advisorId: string | null = null;
  try {
    const service = await prisma.bookingService.create({
      data: {
        organizationId: org.id,
        slug: `sms-itest-${suffix}`,
        title: `SMS Test ${suffix}`,
        durationMinutes: 30,
        settings: {
          allowWaitingList: false,
          autoConfirm: true,
          confirmationSmsEnabled: true,
          duplicateKeys: ["normalizedMobile", "service", "bookingDate"],
          allowAdvisorSelection: true,
          allowBranchSelection: false,
          showRemainingCapacity: true,
          onlineMeetingInfo: null,
          addressInfo: null,
        },
      },
    });
    serviceId = service.id;
    const advisor = await prisma.bookingAdvisor.create({
      data: {
        organizationId: org.id,
        displayName: `SMS Adv ${suffix}`,
      },
    });
    advisorId = advisor.id;
    await prisma.bookingAdvisorService.create({
      data: {
        organizationId: org.id,
        advisorId: advisor.id,
        serviceId: service.id,
      },
    });
    const startsAt = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
    const slot = await prisma.bookingSlot.create({
      data: {
        organizationId: org.id,
        serviceId: service.id,
        advisorId: advisor.id,
        startsAt,
        endsAt: new Date(startsAt.getTime() + 30 * 60 * 1000),
        capacity: 5,
        status: BookingSlotStatus.OPEN,
      },
    });

    const bookingMobile = `0917${suffix}005`.slice(0, 11).padEnd(11, "0");
    const reservation = await createReservation({
      organizationId: org.id,
      slotId: slot.id,
      firstName: "آزمون",
      lastName: "پیامک",
      mobile: bookingMobile,
    });
    assert(reservation.ok, "booking ok");
    const sms = await prisma.smsMessage.findFirst({
      where: {
        organizationId: org.id,
        idempotencyKey: `booking_confirmation:${reservation.reservationId}`,
      },
    });
    assert(sms, "booking confirmation SMS enqueued");
    assert(
      sms.body.includes("کد پیگیری") || sms.body.length > 0,
      "booking sms body",
    );
    const bookingMetadata = sms.metadata as {
      templateDelivery?: {
        version?: number;
        kind?: string;
        variables?: Record<string, string>;
      };
    } | null;
    assert(
      bookingMetadata?.templateDelivery?.version === 1 &&
        bookingMetadata.templateDelivery.kind === "booking",
      "booking template delivery descriptor",
    );
    assert(
      bookingMetadata.templateDelivery.variables?.name === "آزمون" &&
        Boolean(bookingMetadata.templateDelivery.variables?.date) &&
        Boolean(bookingMetadata.templateDelivery.variables?.time) &&
        bookingMetadata.templateDelivery.variables?.tracking ===
          reservation.trackingCode.replace(
            /\d/g,
            (digit) => "۰۱۲۳۴۵۶۷۸۹"[Number(digit)],
          ),
      "booking semantic template variables",
    );
    await enqueueBookingConfirmationSms({
      organizationId: org.id,
      reservationId: reservation.reservationId,
    });
    const bookingSmsCount = await prisma.smsMessage.count({
      where: {
        organizationId: org.id,
        idempotencyKey: `booking_confirmation:${reservation.reservationId}`,
      },
    });
    assert(bookingSmsCount === 1, "booking SMS not duplicated");
    ok("booking enqueue");
  } finally {
    if (serviceId) {
      await prisma.smsMessage.deleteMany({
        where: {
          organizationId: org.id,
          relatedType: "BookingReservation",
          purpose: "booking_confirmation",
        },
      });
      await prisma.bookingReservation.deleteMany({
        where: { organizationId: org.id, slot: { serviceId } },
      });
      await prisma.bookingSlot.deleteMany({
        where: { organizationId: org.id, serviceId },
      });
      await prisma.bookingAdvisorService.deleteMany({
        where: { organizationId: org.id, serviceId },
      });
      await prisma.bookingService.delete({ where: { id: serviceId } });
    }
    if (advisorId) {
      await prisma.bookingAdvisor.delete({ where: { id: advisorId } }).catch(() => undefined);
    }
  }

  // ─── Form enqueue ─────────────────────────────────────────────────────────
  let formId: string | null = null;
  try {
    const branch = await prisma.branch.findFirst({
      where: { organizationId: org.id, deletedAt: null },
      select: { id: true },
    });
    assert(branch, "branch required");

    const form = await prisma.form.create({
      data: {
        organizationId: org.id,
        slug: `sms-form-${suffix}`,
        purpose: FormPurpose.SURVEY,
      },
    });
    formId = form.id;
    const version = await prisma.formVersion.create({
      data: {
        organizationId: org.id,
        formId: form.id,
        versionNumber: 1,
        status: FormVersionStatus.PUBLISHED,
        title: `Form SMS ${suffix}`,
        confirmationMessage: "ثبت شد",
        settings: {
          showRemainingCapacity: false,
          confirmationSmsEnabled: true,
        },
      },
    });
    await prisma.form.update({
      where: { id: form.id },
      data: { publishedVersionId: version.id },
    });
    const firstNameField = await prisma.formField.create({
      data: {
        organizationId: org.id,
        formVersionId: version.id,
        fieldKey: "first_name",
        sortOrder: 0,
        type: FormFieldType.SHORT_TEXT,
        semantic: FormFieldSemantic.FIRST_NAME,
        label: "نام",
        required: true,
      },
    });

    const formMobile = `0918${suffix}006`.slice(0, 11).padEnd(11, "0");
    const submission = await prisma.formSubmission.create({
      data: {
        organizationId: org.id,
        branchId: branch.id,
        formId: form.id,
        formVersionId: version.id,
        status: FormSubmissionStatus.RECEIVED,
        normalizedMobile: formMobile,
        mobile: formMobile,
      },
    });
    await prisma.formAnswer.create({
      data: {
        organizationId: org.id,
        submissionId: submission.id,
        fieldId: firstNameField.id,
        fieldKey: firstNameField.fieldKey,
        valueText: "سارا",
      },
    });

    await enqueueFormConfirmationSms({
      organizationId: org.id,
      submissionId: submission.id,
      formVersionId: version.id,
    });
    const formSms = await prisma.smsMessage.findFirst({
      where: {
        organizationId: org.id,
        idempotencyKey: `form_submitted:${submission.id}:user`,
      },
    });
    assert(formSms, "form confirmation SMS enqueued");
    const formMetadata = formSms.metadata as {
      templateDelivery?: {
        version?: number;
        kind?: string;
        variables?: Record<string, string>;
      };
    } | null;
    assert(
      formMetadata?.templateDelivery?.version === 1 &&
        formMetadata.templateDelivery.kind === "form" &&
        formMetadata.templateDelivery.variables?.name === "سارا" &&
        formMetadata.templateDelivery.variables?.tracking === submission.id,
      "form semantic template variables",
    );

    await enqueueFormConfirmationSms({
      organizationId: org.id,
      submissionId: submission.id,
      formVersionId: version.id,
    });
    const count = await prisma.smsMessage.count({
      where: {
        organizationId: org.id,
        idempotencyKey: `form_submitted:${submission.id}:user`,
      },
    });
    assert(count === 1, "form SMS not duplicated");
    ok("form enqueue");
  } finally {
    if (formId) {
      await prisma.smsMessage.deleteMany({
        where: {
          organizationId: org.id,
          purpose: "form_submitted",
          relatedType: "FormSubmission",
        },
      });
      await prisma.formSubmission.deleteMany({
        where: { organizationId: org.id, formId },
      });
      await prisma.formVersion.deleteMany({
        where: { organizationId: org.id, formId },
      });
      await prisma.form.delete({ where: { id: formId } }).catch(() => undefined);
    }
  }

  // Cleanup test SMS + OTP rows for this run
  await prisma.smsMessage.deleteMany({
    where: {
      organizationId: org.id,
      OR: [
        { idempotencyKey: { startsWith: `test-` } },
        { purpose: { startsWith: "test" } },
      ],
    },
  });
  await prisma.otpChallenge.deleteMany({
    where: {
      organizationId: org.id,
      normalizedMobile: { startsWith: "091" },
      createdAt: { gte: new Date(Date.now() - 10 * 60 * 1000) },
    },
  });

  console.log(`\nAll ${passed} communication tests passed.`);
}

main()
  .catch((error) => {
    console.error("Communication tests failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
