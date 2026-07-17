/**
 * Mocked SMS.ir adapter tests. Native fetch is replaced for every network case;
 * this script never contacts SMS.ir.
 */
import assert from "node:assert/strict";
import {
  sendOtpTemplate,
  sendPatternTemplate,
} from "../lib/communication/send";
import {
  NullSmsProvider,
  getSmsProvider,
  resetSmsProviderCache,
} from "../lib/communication/sms-provider";

const ENV_KEYS = [
  "STAROS_SMS_ENABLED",
  "STAROS_SMS_PROVIDER",
  "SMSIR_API_KEY",
  "SMSIR_API_BASE_URL",
  "SMSIR_TIMEOUT_MS",
  "SMSIR_OTP_TEMPLATE_ID",
  "SMSIR_BOOKING_TEMPLATE_ID",
  "SMSIR_FORM_TEMPLATE_ID",
] as const;

const originalEnv = Object.fromEntries(
  ENV_KEYS.map((key) => [key, process.env[key]]),
) as Record<(typeof ENV_KEYS)[number], string | undefined>;
const originalFetch = globalThis.fetch;
let passed = 0;

function configureSmsIr(): void {
  process.env.STAROS_SMS_ENABLED = "true";
  process.env.STAROS_SMS_PROVIDER = "smsir";
  process.env.SMSIR_API_KEY = "mock-api-key";
  process.env.SMSIR_API_BASE_URL = "https://api.sms.ir";
  process.env.SMSIR_TIMEOUT_MS = "50";
  process.env.SMSIR_OTP_TEMPLATE_ID = "101";
  process.env.SMSIR_BOOKING_TEMPLATE_ID = "102";
  process.env.SMSIR_FORM_TEMPLATE_ID = "103";
  resetSmsProviderCache();
}

function mockFetch(implementation: typeof fetch): void {
  globalThis.fetch = implementation;
}

async function test(name: string, fn: () => Promise<void>): Promise<void> {
  configureSmsIr();
  await fn();
  passed += 1;
  console.log(`✓ ${name}`);
}

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function sendOtp() {
  return sendOtpTemplate({
    toMobile: "09121234567",
    code: "123456",
    correlationId: "mock-test",
  });
}

async function main(): Promise<void> {
  try {
    await test("SMS.ir accepted", async () => {
      mockFetch(async (input, init) => {
        assert.equal(String(input), "https://api.sms.ir/v1/send/verify");
        assert.equal(init?.method, "POST");
        assert.equal(new Headers(init?.headers).get("X-API-KEY"), "mock-api-key");
        assert.deepEqual(JSON.parse(String(init?.body)), {
          mobile: "09121234567",
          templateId: 101,
          parameters: [{ name: "CODE", value: "123456" }],
        });
        return jsonResponse({ status: 1, data: { messageId: 987654 } });
      });
      const result = await sendOtp();
      assert.equal(result.ok, true);
      assert.equal(result.providerMessageId, "987654");
    });

    await test("SMS.ir custom pattern uses database template code", async () => {
      mockFetch(async (input, init) => {
        assert.equal(String(input), "https://api.sms.ir/v1/send/verify");
        assert.deepEqual(JSON.parse(String(init?.body)), {
          mobile: "09121234567",
          templateId: 404,
          parameters: [{ name: "NAME", value: "سارا" }],
        });
        return jsonResponse({ status: 1, data: { messageId: 123456 } });
      });
      const result = await sendPatternTemplate({
        toMobile: "09121234567",
        templateCode: "404",
        parameters: { NAME: "سارا" },
      });
      assert.equal(result.ok, true);
      assert.equal(result.providerMessageId, "123456");
    });

    for (const [status, errorCode, retryable] of [
      [400, "invalid", false],
      [401, "configuration", false],
      [429, "rate_limited", true],
      [500, "unavailable", true],
    ] as const) {
      await test(`SMS.ir HTTP ${status}`, async () => {
        mockFetch(async () => jsonResponse({ status: 99 }, status));
        const result = await sendOtp();
        assert.equal(result.ok, false);
        if (!result.ok) {
          assert.equal(result.errorCode, errorCode);
          assert.equal(result.retryable, retryable);
        }
      });
    }

    await test("SMS.ir timeout aborts fetch", async () => {
      process.env.SMSIR_TIMEOUT_MS = "5";
      mockFetch((_input, init) => {
        return new Promise<Response>((_resolve, reject) => {
          const rejectAbort = () =>
            reject(new DOMException("mock abort", "AbortError"));
          if (init?.signal?.aborted) rejectAbort();
          else init?.signal?.addEventListener("abort", rejectAbort, {
            once: true,
          });
        });
      });
      const result = await sendOtp();
      assert.equal(result.ok, false);
      if (!result.ok) {
        assert.equal(result.errorCode, "timeout");
        assert.equal(result.retryable, true);
      }
    });

    await test("SMS.ir malformed JSON", async () => {
      mockFetch(async () => new Response("{", { status: 200 }));
      const result = await sendOtp();
      assert.equal(result.ok, false);
      if (!result.ok) {
        assert.equal(result.errorCode, "malformed_response");
        assert.equal(result.retryable, true);
      }
    });

    await test("SMS.ir business failure", async () => {
      mockFetch(async () => jsonResponse({ status: 10, data: null }));
      const result = await sendOtp();
      assert.equal(result.ok, false);
      if (!result.ok) {
        assert.equal(result.errorCode, "configuration");
        assert.equal(result.retryable, false);
      }
    });

    await test("SMS.ir missing API key", async () => {
      delete process.env.SMSIR_API_KEY;
      mockFetch(async () => {
        assert.fail("fetch must not run without an API key");
      });
      const result = await sendOtp();
      assert.equal(result.ok, false);
      if (!result.ok) assert.equal(result.errorCode, "configuration");
    });

    await test("SMS.ir missing OTP template", async () => {
      delete process.env.SMSIR_OTP_TEMPLATE_ID;
      mockFetch(async () => {
        assert.fail("fetch must not run without a template");
      });
      const result = await sendOtp();
      assert.equal(result.ok, false);
      if (!result.ok) assert.equal(result.errorCode, "configuration");
    });

    await test("Null provider disabled", async () => {
      process.env.STAROS_SMS_ENABLED = "false";
      process.env.STAROS_SMS_PROVIDER = "null";
      resetSmsProviderCache();
      mockFetch(async () => {
        assert.fail("Null provider must not call fetch");
      });
      const provider = getSmsProvider();
      assert.ok(provider instanceof NullSmsProvider);
      const result = await provider.sendOtpTemplate({
        toMobile: "09121234567",
        code: "123456",
      });
      assert.equal(result.ok, false);
      if (!result.ok) assert.equal(result.errorCode, "disabled");
    });

    console.log(`\nAll ${passed} mocked SMS.ir tests passed.`);
  } finally {
    globalThis.fetch = originalFetch;
    for (const key of ENV_KEYS) {
      const value = originalEnv[key];
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    resetSmsProviderCache();
  }
}

main().catch((error) => {
  console.error("Mocked SMS.ir tests failed.");
  if (error instanceof Error) console.error(error.message);
  process.exitCode = 1;
});
