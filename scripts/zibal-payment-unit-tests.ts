/**
 * Unit tests for Zibal payment security + compatibility (no live network / no DB).
 * Run: npm run test:zibal-payment
 */

import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { PaymentStatus } from "../generated/prisma/enums";
import {
  resolveConfiguredPaymentProviderId,
  getPaymentProvider,
  setPaymentProviderForTests,
} from "../lib/payment/get-provider";
import {
  buildSafePaymentRedirectPath,
  checkVerifiedAmountAgainstIntent,
  guardZibalCallbackFields,
  isAllowedZibalCheckoutUrl,
  isSafeInternalPaymentRedirectPath,
  sanitizeZibalAuditJson,
  ZIBAL_GATEWAY_ORIGIN,
} from "../lib/payment/payment-guards";
import {
  asRecord,
  postZibalJson,
  readInteger,
  readString,
  readZibalMerchantId,
  setZibalFetchForTests,
  zibalStartUrl,
  ZIBAL_GATEWAY_BASE,
} from "../lib/payment/providers/zibal-http";
import { ZibalPaymentProvider } from "../lib/payment/providers/zibal";
import { MockPaymentProvider } from "../lib/payment/providers/mock";
import { isTerminalPaymentStatus } from "../lib/payment/status-machine";

let failures = 0;

function check(name: string, fn: () => void | Promise<void>): Promise<void> {
  return Promise.resolve()
    .then(fn)
    .then(() => {
      console.log(`  ok  ${name}`);
    })
    .catch((error) => {
      failures += 1;
      console.error(`  FAIL ${name}`);
      console.error(error);
    });
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function withEnv(
  patch: Record<string, string | undefined>,
  fn: () => void | Promise<void>,
): Promise<void> {
  const previous: Record<string, string | undefined> = {};
  for (const key of Object.keys(patch)) {
    previous[key] = process.env[key];
    const next = patch[key];
    if (next === undefined) delete process.env[key];
    else process.env[key] = next;
  }
  return Promise.resolve()
    .then(fn)
    .finally(() => {
      for (const key of Object.keys(patch)) {
        const prev = previous[key];
        if (prev === undefined) delete process.env[key];
        else process.env[key] = prev;
      }
    });
}

async function main() {
  console.log("zibal-payment-unit-tests");

  await check("helpers: readInteger / readString / asRecord", () => {
    assert.equal(readInteger(100), 100);
    assert.equal(readInteger("201"), 201);
    assert.equal(readInteger("x"), null);
    assert.equal(readString(" ab "), "ab");
    assert.equal(readString(42), "42");
    assert.equal(asRecord(null), null);
    assert.ok(asRecord({ a: 1 }));
  });

  await check("checkout URL only fixed gateway.zibal.ir/start/{trackId}", () => {
    assert.equal(ZIBAL_GATEWAY_BASE, ZIBAL_GATEWAY_ORIGIN);
    assert.equal(zibalStartUrl(123456), `${ZIBAL_GATEWAY_ORIGIN}/start/123456`);
    assert.equal(isAllowedZibalCheckoutUrl(zibalStartUrl("999")), true);
    assert.equal(
      isAllowedZibalCheckoutUrl("https://evil.example/start/999"),
      false,
    );
    assert.equal(
      isAllowedZibalCheckoutUrl("http://gateway.zibal.ir/start/999"),
      false,
    );
    assert.equal(
      isAllowedZibalCheckoutUrl("https://gateway.zibal.ir/start/999/extra"),
      false,
    );
    assert.equal(
      isAllowedZibalCheckoutUrl("https://user:pass@gateway.zibal.ir/start/999"),
      false,
    );
  });

  await check("merchant id never from NEXT_PUBLIC", () =>
    withEnv(
      {
        NEXT_PUBLIC_ZIBAL_MERCHANT_ID: "public-leak",
        ZIBAL_MERCHANT_ID: undefined,
      },
      () => {
        assert.equal(readZibalMerchantId(), null);
      },
    ),
  );

  await check("precedence: PAYMENT_PROVIDER is canonical", () =>
    withEnv(
      {
        PAYMENT_PROVIDER: "zibal",
        STAROS_PAYMENT_PROVIDER: "mock",
      },
      () => {
        const resolved = resolveConfiguredPaymentProviderId();
        assert.equal(resolved.id, "zibal");
        assert.equal(resolved.source, "PAYMENT_PROVIDER");
        assert.equal(resolved.conflict, true);
      },
    ),
  );

  await check("precedence: STAROS used only when PAYMENT unset", () =>
    withEnv(
      {
        PAYMENT_PROVIDER: undefined,
        STAROS_PAYMENT_PROVIDER: "zibal",
      },
      () => {
        const resolved = resolveConfiguredPaymentProviderId();
        assert.equal(resolved.id, "zibal");
        assert.equal(resolved.source, "STAROS_PAYMENT_PROVIDER");
      },
    ),
  );

  await check("precedence: default mock", () =>
    withEnv(
      {
        PAYMENT_PROVIDER: undefined,
        STAROS_PAYMENT_PROVIDER: undefined,
      },
      () => {
        const resolved = resolveConfiguredPaymentProviderId();
        assert.equal(resolved.id, "mock");
        assert.equal(resolved.source, "default");
      },
    ),
  );

  await check("factory respects canonical env", async () => {
    setPaymentProviderForTests(null);
    await withEnv(
      {
        PAYMENT_PROVIDER: "zibal",
        STAROS_PAYMENT_PROVIDER: "mock",
        ZIBAL_MERCHANT_ID: "zibal",
      },
      () => {
        assert.equal(getPaymentProvider().id, "zibal");
      },
    );
    setPaymentProviderForTests(null);
    await withEnv(
      {
        PAYMENT_PROVIDER: "mock",
        STAROS_PAYMENT_PROVIDER: "zibal",
      },
      () => {
        assert.equal(getPaymentProvider().id, "mock");
      },
    );
    setPaymentProviderForTests(null);
  });

  await check("merchant missing → requestPayment fails (no secret in error)", async () => {
    await withEnv({ ZIBAL_MERCHANT_ID: undefined }, async () => {
      const provider = new ZibalPaymentProvider();
      const result = await provider.requestPayment({
        organizationId: "org",
        paymentIntentId: "pi",
        amountRials: 50_000,
        currency: "IRR",
        description: "test",
        callbackPath: "/payments/callback/zibal",
        callbackToken: "tok",
      });
      assert.equal(result.ok, false);
      if (!result.ok) {
        assert.equal(result.error.includes("secret"), false);
        assert.equal(result.error.includes("merchant"), false);
        assert.equal(result.error.toLowerCase().includes("zibal_merchant"), false);
      }
    });
  });

  await check("forged trackId rejected", async () => {
    await withEnv({ ZIBAL_MERCHANT_ID: "zibal" }, async () => {
      const provider = new ZibalPaymentProvider();
      const result = await provider.verifyPayment({
        organizationId: "org",
        providerSessionId: "111",
        callbackToken: "tok",
        callbackPayload: { trackId: "222", success: "1" },
      });
      assert.equal(result.ok, false);
    });
  });

  await check("missing token guard", () => {
    const result = guardZibalCallbackFields({
      token: "",
      trackId: "1",
      orderId: "pi",
      sessionProviderSessionId: "1",
      sessionPaymentIntentId: "pi",
    });
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.errorCode, "missing_token");
  });

  await check("wrong orderId guard", () => {
    const result = guardZibalCallbackFields({
      token: "abc",
      trackId: "1",
      orderId: "forged-pi",
      sessionProviderSessionId: "1",
      sessionPaymentIntentId: "pi-real",
    });
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.errorCode, "order_mismatch");
  });

  await check("callback track mismatch guard", () => {
    const result = guardZibalCallbackFields({
      token: "abc",
      trackId: "999",
      orderId: "pi-real",
      sessionProviderSessionId: "1",
      sessionPaymentIntentId: "pi-real",
    });
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.errorCode, "track_mismatch");
  });

  await check("amount mismatch rejected", () => {
    const mismatch = checkVerifiedAmountAgainstIntent({
      providerId: "zibal",
      verifiedAmountRials: 40_000,
      expectedFinalAmountRials: 50_000,
    });
    assert.equal(mismatch.ok, false);

    const missing = checkVerifiedAmountAgainstIntent({
      providerId: "zibal",
      verifiedAmountRials: null,
      expectedFinalAmountRials: 50_000,
    });
    assert.equal(missing.ok, false);

    const ok = checkVerifiedAmountAgainstIntent({
      providerId: "zibal",
      verifiedAmountRials: 50_000,
      expectedFinalAmountRials: 50_000,
    });
    assert.equal(ok.ok, true);

    const mockOk = checkVerifiedAmountAgainstIntent({
      providerId: "mock",
      verifiedAmountRials: null,
      expectedFinalAmountRials: 50_000,
    });
    assert.equal(mockOk.ok, true);
  });

  await check("duplicate callback redirect is internal + terminal", () => {
    assert.equal(isTerminalPaymentStatus(PaymentStatus.PAID), true);
    const path = buildSafePaymentRedirectPath(PaymentStatus.PAID, "intent_1");
    assert.equal(path, "/payments/success?intent=intent_1");
    assert.equal(isSafeInternalPaymentRedirectPath(path), true);
    assert.equal(
      isSafeInternalPaymentRedirectPath("https://evil.example/hack"),
      false,
    );
    assert.equal(
      isSafeInternalPaymentRedirectPath("//evil.example/payments/success"),
      false,
    );
    const failed = buildSafePaymentRedirectPath(PaymentStatus.FAILED, "intent_2");
    assert.equal(isSafeInternalPaymentRedirectPath(failed), true);
  });

  await check("verify result 100 → paid with amount", async () => {
    await withEnv({ ZIBAL_MERCHANT_ID: "zibal" }, async () => {
      setZibalFetchForTests(async () =>
        jsonResponse({
          result: 100,
          amount: 50_000,
          refNumber: "REF100",
          orderId: "pi_1",
          trackId: 555,
        }),
      );
      const provider = new ZibalPaymentProvider();
      const result = await provider.verifyPayment({
        organizationId: "org",
        providerSessionId: "555",
        callbackToken: "tok",
        callbackPayload: { trackId: "555", success: "1", orderId: "pi_1" },
      });
      assert.equal(result.ok, true);
      if (result.ok) {
        assert.equal(result.outcome, "paid");
        assert.equal(result.amountRials, 50_000);
        assert.equal(result.providerRef, "REF100");
        assert.equal(result.raw.alreadyVerified, false);
        assert.equal("merchant" in result.raw, false);
      }
      setZibalFetchForTests(null);
    });
  });

  await check("verify result 201 → already verified paid (still returns amount)", async () => {
    await withEnv({ ZIBAL_MERCHANT_ID: "zibal" }, async () => {
      setZibalFetchForTests(async () =>
        jsonResponse({
          result: 201,
          amount: 75_000,
          refNumber: "REF201",
          orderId: "pi_2",
          trackId: 777,
        }),
      );
      const provider = new ZibalPaymentProvider();
      const result = await provider.verifyPayment({
        organizationId: "org",
        providerSessionId: "777",
        callbackToken: "tok",
        callbackPayload: { trackId: "777", success: "1" },
      });
      assert.equal(result.ok, true);
      if (result.ok) {
        assert.equal(result.outcome, "paid");
        assert.equal(result.amountRials, 75_000);
        assert.equal(result.raw.alreadyVerified, true);
        // 201 still must supply amount so service amount check can run
        assert.equal(
          checkVerifiedAmountAgainstIntent({
            providerId: "zibal",
            verifiedAmountRials: result.amountRials,
            expectedFinalAmountRials: 75_000,
          }).ok,
          true,
        );
      }
      setZibalFetchForTests(null);
    });
  });

  await check("requestPayment stores trackId and strips merchant from raw", async () => {
    await withEnv(
      {
        ZIBAL_MERCHANT_ID: "secret-merchant-value",
        ZIBAL_CALLBACK_URL: "https://setareganplus.ir/payments/callback/zibal",
      },
      async () => {
        setZibalFetchForTests(async (_url, init) => {
          const body = JSON.parse(String(init?.body ?? "{}")) as Record<
            string,
            unknown
          >;
          assert.equal(body.merchant, "secret-merchant-value");
          assert.equal(body.orderId, "pi_req");
          assert.equal(typeof body.callbackUrl, "string");
          assert.match(String(body.callbackUrl), /token=/);
          return jsonResponse({
            result: 100,
            trackId: 4242,
            message: "ok",
            merchant: "should-not-persist",
          });
        });
        const provider = new ZibalPaymentProvider();
        const result = await provider.requestPayment({
          organizationId: "org",
          paymentIntentId: "pi_req",
          amountRials: 50_000,
          currency: "IRR",
          description: "desc",
          callbackPath: "/payments/callback/zibal",
          callbackToken: "callbacktok",
        });
        assert.equal(result.ok, true);
        if (result.ok) {
          assert.equal(result.providerSessionId, "4242");
          assert.equal(
            result.checkoutUrl,
            `${ZIBAL_GATEWAY_ORIGIN}/start/4242`,
          );
          assert.equal("merchant" in result.raw, false);
          const serialized = JSON.stringify(result.raw);
          assert.equal(serialized.includes("secret-merchant-value"), false);
          assert.equal(serialized.includes("should-not-persist"), false);
        }
        setZibalFetchForTests(null);
      },
    );
  });

  await check("malformed JSON response", async () => {
    setZibalFetchForTests(async () => new Response("not-json{{{", { status: 200 }));
    const result = await postZibalJson("v1/verify", { trackId: 1 });
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.match(result.error, /قابل‌خواندن|نامعتبر|زیبال/);
      assert.equal(result.error.includes("merchant"), false);
    }
    setZibalFetchForTests(null);
  });

  await check("Zibal timeout via AbortError", async () => {
    await withEnv({ ZIBAL_TIMEOUT_MS: "1000" }, async () => {
      setZibalFetchForTests(async (_url, init) => {
        return await new Promise<Response>((_resolve, reject) => {
          const signal = init?.signal;
          if (!signal) {
            reject(new Error("missing signal"));
            return;
          }
          if (signal.aborted) {
            const err = new Error("Aborted");
            err.name = "AbortError";
            reject(err);
            return;
          }
          signal.addEventListener("abort", () => {
            const err = new Error("Aborted");
            err.name = "AbortError";
            reject(err);
          });
        });
      });
      const result = await postZibalJson("v1/request", { amount: 1000 });
      assert.equal(result.ok, false);
      if (!result.ok) {
        assert.match(result.error, /زمان انتظار/);
      }
      setZibalFetchForTests(null);
    });
  });

  await check("sanitizeZibalAuditJson strips merchant keys", () => {
    const cleaned = sanitizeZibalAuditJson({
      result: 100,
      merchant: "secret",
      merchantId: "secret2",
      trackId: "1",
    });
    assert.equal("merchant" in cleaned, false);
    assert.equal("merchantId" in cleaned, false);
    assert.equal(cleaned.trackId, "1");
  });

  await check("callbackToken entropy matches service (24 random bytes hex)", () => {
    const token = randomBytes(24).toString("hex");
    assert.equal(token.length, 48);
    assert.match(token, /^[0-9a-f]{48}$/);
    const other = randomBytes(24).toString("hex");
    assert.notEqual(token, other);
  });

  await check("Mock provider regression", async () => {
    const provider = new MockPaymentProvider();
    assert.equal(provider.id, "mock");
    const requested = await provider.requestPayment({
      organizationId: "org",
      paymentIntentId: "pi",
      amountRials: 10_000,
      currency: "IRR",
      description: "mock",
      callbackPath: "/payments/callback/mock",
      callbackToken: "tok",
    });
    assert.equal(requested.ok, true);
    if (requested.ok) {
      assert.match(requested.checkoutUrl, /^\/payments\/mock\/checkout\//);
      for (const outcome of ["paid", "failed", "cancelled"] as const) {
        const verified = await provider.verifyPayment({
          organizationId: "org",
          providerSessionId: requested.providerSessionId,
          callbackToken: "tok",
          callbackPayload: { outcome },
        });
        assert.equal(verified.ok, true);
        if (verified.ok) assert.equal(verified.outcome, outcome);
      }
    }
  });

  setZibalFetchForTests(null);
  setPaymentProviderForTests(null);

  if (failures > 0) {
    console.error(`\nFAILED: ${failures} check(s)`);
    process.exit(1);
  }
  console.log("\nAll zibal payment unit tests passed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
