/**
 * Explicitly guarded real SMS.ir OTP-template test.
 *
 * Run only with:
 * SMSIR_TEST_CONFIRM=YES SMSIR_TEST_MOBILE=09xxxxxxxxx npm run test:smsir
 */
import { generateSecureOtpDigits } from "../lib/communication/otp-crypto";
import { getSmsIrConfigurationStatus } from "../lib/communication/providers/smsir-provider";
import { sendOtpTemplate } from "../lib/communication/send";
import { readSmsProviderName } from "../lib/communication/sms-provider";
import { normalizeIranianMobile } from "../lib/forms/normalize-mobile";

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

function maskMobile(mobile: string): string {
  return `${mobile.slice(0, 4)}•••••${mobile.slice(-2)}`;
}

async function main(): Promise<void> {
  if (process.env.SMSIR_TEST_CONFIRM !== "YES") {
    fail("Refusing real send: set SMSIR_TEST_CONFIRM=YES explicitly.");
  }
  if (
    process.env.STAROS_SMS_ENABLED !== "true" ||
    readSmsProviderName() !== "smsir"
  ) {
    fail("Refusing real send: enabled SMS.ir provider is required.");
  }

  const mobile = normalizeIranianMobile(process.env.SMSIR_TEST_MOBILE ?? "");
  if (!mobile.ok) {
    fail("Refusing real send: SMSIR_TEST_MOBILE is missing or invalid.");
  }

  const status = getSmsIrConfigurationStatus();
  if (!status.providerConfigured || !status.otpTemplateConfigured) {
    fail("Refusing real send: SMS.ir configuration is incomplete.");
  }

  console.log(`Sending one OTP template to ${maskMobile(mobile.normalized)}...`);
  const result = await sendOtpTemplate({
    toMobile: mobile.normalized,
    code: generateSecureOtpDigits(6),
    correlationId: "guarded-smsir-test",
  });
  if (!result.ok) {
    fail(`SMS.ir test failed safely (${result.errorCode}).`);
  }
  console.log("SMS.ir accepted the guarded OTP-template test.");
}

main().catch(() => {
  console.error("SMS.ir test failed safely (unexpected error).");
  process.exitCode = 1;
});
