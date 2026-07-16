/**
 * Pure smoke tests for communication crypto / null provider (no database).
 * Run: npx tsx scripts/communication-smoke.ts
 */

import assert from "node:assert/strict";
import {
  generateSecureOtpDigits,
  hashOtpCode,
  normalizeOtpInput,
  verifyOtpCode,
} from "../lib/communication/otp-crypto";
import {
  NullSmsProvider,
  getSmsProvider,
  resetSmsProviderCache,
} from "../lib/communication/sms-provider";
import {
  computeSmsBackoffMs,
  renderSmsTemplate,
} from "../lib/communication/queue";
import { maskSecret } from "../lib/communication/config";

let passed = 0;

function test(name: string, fn: () => void | Promise<void>) {
  return Promise.resolve()
    .then(() => fn())
    .then(() => {
      passed += 1;
      console.log(`✓ ${name}`);
    })
    .catch((error) => {
      console.error(`✗ ${name}`);
      throw error;
    });
}

async function main() {
  await test("secure 6-digit OTP", () => {
    const code = generateSecureOtpDigits(6);
    assert.match(code, /^\d{6}$/);
  });

  await test("OTP hash roundtrip without plaintext in hash", () => {
    const code = "483920";
    const hash = hashOtpCode(code);
    assert.equal(hash.includes(code), false);
    assert.equal(verifyOtpCode(code, hash), true);
    assert.equal(verifyOtpCode("000000", hash), false);
  });

  await test("Persian digit normalization", () => {
    assert.equal(normalizeOtpInput("۴۸۳۹۲۰"), "483920");
  });

  await test("template render + backoff", () => {
    assert.equal(
      renderSmsTemplate("کد {{trackingCode}}", { trackingCode: "A1" }),
      "کد A1",
    );
    assert.equal(computeSmsBackoffMs(1), 30_000);
    assert.equal(computeSmsBackoffMs(3), 120_000);
  });

  await test("NullSmsProvider factory", async () => {
    process.env.STAROS_SMS_ENABLED = "true";
    process.env.STAROS_SMS_PROVIDER = "null";
    resetSmsProviderCache();
    const provider = getSmsProvider();
    assert.ok(provider instanceof NullSmsProvider);
    const result = await provider.sendText({
      toMobile: "09121234567",
      body: "smoke",
    });
    assert.equal(result.ok, true);
  });

  await test("secret masking", () => {
    assert.equal(maskSecret(null), null);
    assert.equal(maskSecret("abcdefgh"), "••••efgh");
  });

  console.log(`\nAll ${passed} communication smoke tests passed.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
